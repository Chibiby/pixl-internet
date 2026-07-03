"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatPeso } from "@/lib/format";
import { deriveStatus, type Client, type Plan } from "@/lib/types";
import {
  deleteClient,
  saveClient,
  toggleConnection,
  type ClientInput,
} from "@/app/admin/actions";

const emptyForm: ClientInput = {
  full_name: "",
  pppoe_username: "",
  plan_id: null,
  status: "active",
  balance: 0,
  due_date: new Date().toISOString().slice(0, 10),
};

export function AdminClientTable({
  clients,
  plans,
}: {
  clients: Client[];
  plans: Plan[];
}) {
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [deleting, setDeleting] = useState<Client | null>(null);

  function openAdd() {
    setForm({ ...emptyForm, plan_id: plans[0]?.id ?? null });
    setDialogOpen(true);
  }

  function openEdit(c: Client) {
    setForm({
      id: c.id,
      full_name: c.full_name,
      pppoe_username: c.pppoe_username,
      plan_id: c.plan_id,
      status: c.status,
      balance: c.balance,
      due_date: c.due_date,
    });
    setDialogOpen(true);
  }

  function submitForm() {
    if (!form.full_name.trim() || !form.pppoe_username.trim()) {
      toast.error("Name and PPPoE username are required");
      return;
    }
    startTransition(async () => {
      const res = await saveClient(form);
      if (res.ok) {
        toast.success(res.message);
        setDialogOpen(false);
      } else {
        toast.error(res.message);
      }
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteClient(deleting.id);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      setDeleting(null);
    });
  }

  function onToggle(c: Client, enable: boolean) {
    startTransition(async () => {
      const res = await toggleConnection(c.id, c.pppoe_username, enable ? "enable" : "disable");
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Clients</h2>
        <Button onClick={openAdd} size="sm" className="glow-cyan font-semibold">
          <Plus className="size-4" /> Add client
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>PPPoE</TableHead>
              <TableHead>Connection</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium whitespace-nowrap">{c.full_name}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {c.plan ? (
                    <span className="text-neon-purple">{c.plan.name}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={deriveStatus(c)} />
                </TableCell>
                <TableCell
                  className={c.balance > 0 ? "font-semibold text-amber-300" : "text-neon-green"}
                >
                  {formatPeso(c.balance)}
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(c.due_date)}</TableCell>
                <TableCell className="font-mono text-xs">{c.pppoe_username}</TableCell>
                <TableCell>
                  <Switch
                    checked={c.status === "active"}
                    disabled={pending}
                    onCheckedChange={(v) => onToggle(c, v)}
                    aria-label={`Toggle connection for ${c.full_name}`}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(c)}>
                        <Pencil className="size-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 className="size-4" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="neon-card">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit client" : "Add client"}</DialogTitle>
            <DialogDescription>
              Client account and PPPoE details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Juan Dela Cruz"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pppoe">PPPoE username</Label>
              <Input
                id="pppoe"
                value={form.pppoe_username}
                onChange={(e) => setForm({ ...form, pppoe_username: e.target.value })}
                placeholder="pixl-juandc"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Plan</Label>
                <Select
                  value={form.plan_id ?? ""}
                  onValueChange={(v) => setForm({ ...form, plan_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatPeso(p.monthly_price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as "active" | "suspended" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="balance">Balance (₱)</Label>
                <Input
                  id="balance"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.balance}
                  onChange={(e) =>
                    setForm({ ...form, balance: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due_date">Due date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={pending} className="glow-cyan font-semibold">
              {form.id ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="neon-card">
          <DialogHeader>
            <DialogTitle>Remove {deleting?.full_name}?</DialogTitle>
            <DialogDescription>
              This deletes the client and all their payments and usage history.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
              <Trash2 className="size-4" /> Remove client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
