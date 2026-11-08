import { z } from "zod";

const selector = {
  playerId: z.string().regex(/^[\w:.-]+$/).max(200).optional(),
};
const duration = { durationSeconds: z.number().finite().min(0.25).max(3600).optional() };

export const overlayCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("show-team"), ...selector, ...duration }).strict(),
  z.object({
    action: z.literal("show-pokemon"),
    ...selector,
    ...duration,
    slot: z.number().int().min(1).max(6).optional(),
    captureId: z.string().regex(/^[\w:.-]+$/).max(200).optional(),
  }).strict().refine((value) => Boolean(value.slot) !== Boolean(value.captureId), {
    message: "Choose exactly one party slot or capture ID.",
  }),
  z.object({ action: z.literal("live"), ...selector, ...duration }).strict(),
  z.object({ action: z.literal("hide"), ...duration }).strict(),
]);

export type OverlayCommand = z.infer<typeof overlayCommandSchema>;
export const overlayViewSchema = z.object({
  mode: z.enum(["team", "pokemon", "live", "hidden"]),
  ...selector,
  captureId: z.string().optional(),
  slot: z.number().int().min(1).max(6).optional(),
}).strict();
export type OverlayView = z.infer<typeof overlayViewSchema>;

export const overlayControlSchema = z.object({
  revision: z.number().int().nonnegative(),
  base: overlayViewSchema,
  temporary: z.object({
    view: overlayViewSchema,
    expiresAt: z.number().finite().nonnegative(),
  }).optional(),
});
export type OverlayControl = z.infer<typeof overlayControlSchema>;

export function defaultOverlayControl(): OverlayControl {
  return { revision: 0, base: { mode: "team" } };
}

export function applyOverlayCommand(
  state: OverlayControl,
  input: OverlayCommand,
  now = Date.now(),
): OverlayControl {
  const command = overlayCommandSchema.parse(input);
  const view: OverlayView = command.action === "hide"
    ? { mode: "hidden" }
    : {
        mode: command.action === "show-team" ? "team" : command.action === "show-pokemon" ? "pokemon" : "live",
        playerId: command.playerId,
        ...(command.action === "show-pokemon" ? { captureId: command.captureId, slot: command.slot } : {}),
      };
  return command.durationSeconds === undefined
    ? { revision: state.revision + 1, base: view }
    : {
        revision: state.revision + 1,
        base: state.base,
        temporary: { view, expiresAt: now + command.durationSeconds * 1000 },
      };
}

export function currentOverlayView(state: OverlayControl, now = Date.now()): OverlayView {
  return state.temporary && now < state.temporary.expiresAt ? state.temporary.view : state.base;
}

export const overlayControlConfigSchema = z.object({ url: z.string(), token: z.string() });
export type OverlayControlConfig = z.infer<typeof overlayControlConfigSchema>;
