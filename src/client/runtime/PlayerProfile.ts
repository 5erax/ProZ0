export type PlayerSkin = "pioneer" | "azure" | "moss";
export const PLAYER_SKINS: readonly {
  id: PlayerSkin;
  name: string;
  color: string;
}[] = [
  { id: "pioneer", name: "Pioneer", color: "#d4a46b" },
  { id: "azure", name: "Azure", color: "#77b4cb" },
  { id: "moss", name: "Moss", color: "#8bad76" },
];
export function selectedPlayerSkin(): PlayerSkin {
  try {
    const value = localStorage.getItem("proz0:skin");
    return PLAYER_SKINS.some((s) => s.id === value)
      ? (value as PlayerSkin)
      : "pioneer";
  } catch {
    return "pioneer";
  }
}
export function savePlayerSkin(skin: PlayerSkin) {
  try { localStorage.setItem("proz0:skin", skin); } catch { /* Preferences are optional when browser storage is unavailable. */ }
}
export function playerSkinFilter(skin: string): string {
  return skin === "azure"
    ? "hue-rotate(150deg) saturate(.8)"
    : skin === "moss"
      ? "hue-rotate(55deg) saturate(.7)"
      : "none";
}
