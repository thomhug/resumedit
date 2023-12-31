"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { siteConfig } from "@/config/site";
import SettingsForm from "./SettingsForm";

export default function SettingsDialog() {
  return (
    <Dialog>
      <DialogTrigger>Settings</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {siteConfig.name}</DialogTitle>
          <DialogDescription>Settings are stored in your browser</DialogDescription>
        </DialogHeader>
        <SettingsForm />
      </DialogContent>
    </Dialog>
  );
}
