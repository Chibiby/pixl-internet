# =============================================================================
# PIXL Internet Service — RouterOS v7 sync script (pixl-sync)
# =============================================================================
# Polls the Supabase Edge Function `router-sync` for pending PPPoE commands,
# applies them (/ppp secret enable|disable), confirms each result back, and
# reports per-session traffic counters. Designed to run every 60 seconds from
# /system scheduler. All traffic is outbound HTTPS, so it works behind CGNAT.
#
# Requires RouterOS v7.13+ (for :deserialize). See router/README.md for setup.
#
# EDIT THESE TWO VALUES before importing:
#   baseUrl — your Supabase project ref
#   secret  — must match the ROUTER_SECRET set with `supabase secrets set`
# =============================================================================

:local baseUrl "https://YOUR-PROJECT-REF.supabase.co/functions/v1/router-sync"
:local secret "YOUR_ROUTER_SECRET"

# check-certificate=no keeps first install simple; see README for enabling
# proper certificate verification once the CA store is set up.
:local certCheck "no"
:local headers ("Authorization: Bearer " . $secret . ",Content-Type: application/json")

# -----------------------------------------------------------------------------
# 1) PULL pending commands and apply them
# -----------------------------------------------------------------------------
:do {
    :local pullRes [/tool fetch url=($baseUrl . "/pull") http-method=post \
        http-header-field=$headers http-data="{}" output=user as-value \
        check-certificate=$certCheck]

    :if (($pullRes->"status") = "finished") do={
        :local payload [:deserialize from=json value=($pullRes->"data")]

        :foreach cmd in=($payload->"commands") do={
            :local cmdId ($cmd->"id")
            :local user ($cmd->"pppoeUser")
            :local action ($cmd->"action")
            :local result "ok"

            :do {
                :if ($action = "enable") do={
                    /ppp secret enable [find name=$user]
                    :log info ("pixl-sync: enabled PPPoE user " . $user)
                } else={
                    /ppp secret disable [find name=$user]
                    # Kick the live session so the disable takes effect now.
                    /ppp active remove [find name=$user]
                    :log info ("pixl-sync: disabled PPPoE user " . $user)
                }
            } on-error={
                :set result "fail"
                :log warning ("pixl-sync: failed to " . $action . " " . $user)
            }

            # Confirm one command at a time — flat JSON only.
            :do {
                /tool fetch url=($baseUrl . "/confirm") http-method=post \
                    http-header-field=$headers output=user as-value \
                    check-certificate=$certCheck \
                    http-data=("{\"id\":\"" . $cmdId . "\",\"result\":\"" . $result . "\"}")
            } on-error={
                :log warning ("pixl-sync: confirm failed for command " . $cmdId)
            }
        }
    }
} on-error={
    :log warning "pixl-sync: pull request failed (check URL/secret/DNS)"
}

# -----------------------------------------------------------------------------
# 2) REPORT usage for every active PPPoE session
#    Dynamic PPPoE server interfaces are named "<pppoe-USERNAME>".
#    From the router's view: tx-byte = sent to client (download),
#    rx-byte = received from client (upload).
# -----------------------------------------------------------------------------
:foreach sess in=[/ppp active find] do={
    :local user [/ppp active get $sess name]

    :do {
        :local ifId [/interface find name=("<pppoe-" . $user . ">")]
        :if ([:len $ifId] > 0) do={
            :local dlMb ([/interface get $ifId tx-byte] / 1048576)
            :local ulMb ([/interface get $ifId rx-byte] / 1048576)

            /tool fetch url=($baseUrl . "/report") http-method=post \
                http-header-field=$headers output=user as-value \
                check-certificate=$certCheck \
                http-data=("{\"pppoeUser\":\"" . $user . "\",\"download_mb\":" . \
                    [:tostr $dlMb] . ",\"upload_mb\":" . [:tostr $ulMb] . \
                    ",\"status\":\"active\"}")
        }
    } on-error={
        :log warning ("pixl-sync: report failed for " . $user)
    }
}
