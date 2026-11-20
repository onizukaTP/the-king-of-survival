import { z } from 'zod';

const slug = (prefix: string) => z.string().regex(new RegExp(String.raw`^${prefix}\.[a-z0-9_]+$`), `must look like ${prefix}.some_slug`);
const assetId = z.string().min(1);

export const characterSchema = z.object({
  id: slug('character'),
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
  portrait: assetId,
});

export const newGameSchema = z.object({
  startingCharacter: slug('character'),
});

export type Character = z.infer<typeof characterSchema>;
export type NewGameConfig = z.infer<typeof newGameSchema>;
