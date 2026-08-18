import { prisma } from "@/lib/prisma";

// A booth can be staffed by several people from the same company. Everyone on
// the staff list shares the same lead list and can edit the listing. The older
// Vendor.userId "primary contact" link still works, so nothing set up before
// this change breaks.
export async function getMyBooth(userId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { vendorId: true },
  });
  if (me?.vendorId) {
    return prisma.vendor.findUnique({ where: { id: me.vendorId } });
  }
  return prisma.vendor.findUnique({ where: { userId } });
}
