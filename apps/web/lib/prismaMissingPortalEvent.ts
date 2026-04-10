import { Prisma } from "@/generated/prisma";

/** P2021: table missing — e.g. migrations not applied for PortalEvent. */
export function isPortalEventTableMissing(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021";
}

/** P2022: column missing — e.g. EventSignup adults/kids migration not applied yet. */
export function isPrismaColumnMissing(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022";
}
