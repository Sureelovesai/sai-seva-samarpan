/**
 * Migration script to fix existing notification URLs
 * Updates notifications with actionUrl = '/admin/seva-signups' to include activityId
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

async function fixNotificationUrls() {
  try {
    console.log("Starting notification URL migration...");

    // Find all NEW_SIGNUP notifications with incomplete actionUrl
    const notificationsToFix = await prisma.notificationLog.findMany({
      where: {
        triggerType: "NEW_SIGNUP",
        actionUrl: "/admin/seva-signups",
      },
    });

    console.log(`Found ${notificationsToFix.length} notifications to fix`);

    if (notificationsToFix.length === 0) {
      console.log("No notifications to fix!");
      return;
    }

    let fixed = 0;
    let failed = 0;

    for (const notification of notificationsToFix) {
      try {
        // The relatedId is the signup ID
        const signup = await prisma.sevaSignup.findUnique({
          where: { id: notification.relatedId },
          select: { activityId: true },
        });

        if (signup && signup.activityId) {
          // Update the notification with the correct actionUrl
          await prisma.notificationLog.update({
            where: { id: notification.id },
            data: {
              actionUrl: `/admin/seva-signups?activityId=${encodeURIComponent(
                signup.activityId
              )}`,
            },
          });
          console.log(
            `✓ Fixed notification ${notification.id} with activityId: ${signup.activityId}`
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
          err.message
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
