"use client";
import Owl3D from "../../visual/owl/Owl3D";
import { useTheme } from "./shell.tsx";

export function EntryMascot() {
  return <Owl3D theme={useTheme()} />;
}
