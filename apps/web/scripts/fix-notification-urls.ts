import { prisma } from "@/lib/prisma";

async function fixNotificationUrls() {
  try {
    console.log("Starting notification URL migration...");

    // Find all NEW_SIGNUP notifications that have activityId but don't have volunteerName yet
    const notificationsToFix = await prisma.notificationLog.findMany({
      where: {
        triggerType: "NEW_SIGNUP",
        actionUrl: {
          contains: "/admin/seva-signups?activityId=",
        },
      },
    });

    // Filter to only those without volunteerName in the URL
    const needsUpdate = notificationsToFix.filter((n: any) => !n.actionUrl.includes("volunteerName="));

    console.log(`Found ${needsUpdate.length} notifications to fix`);

    if (needsUpdate.length === 0) {
      console.log("No notifications to fix!");
      return;
    }

    let fixed = 0;
    let failed = 0;

    for (const notification of needsUpdate) {
      try {
        // The relatedId is the signup ID
        const signup = await prisma.sevaSignup.findUnique({
          where: { id: notification.relatedId || "" },
          select: { activityId: true, volunteerName: true },
        });

        if (signup && signup.activityId) {
          // Update the notification with the correct actionUrl including volunteer name
          await prisma.notificationLog.update({
            where: { id: notification.id },
            data: {
              actionUrl: `/admin/seva-signups?activityId=${encodeURIComponent(
                signup.activityId
              )}&volunteerName=${encodeURIComponent(signup.volunteerName || "")}`,
            },
          });
          console.log(
            `✓ Fixed notification ${notification.id} with activityId: ${signup.activityId}, name: ${signup.volunteerName}`
          );
          fixed++;
        } else {
          console.warn(
            `✗ Could not find signup for notification ${notification.id}`
          );
          failed++;
        }
      } catch (err) {
        console.error(
          `✗ Error processing notification ${notification.id}:`,
          err instanceof Error ? err.message : String(err)
        );
        failed++;
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Failed: ${failed}`);
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNotificationUrls();
