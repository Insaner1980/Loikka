import { useEffect, useCallback } from "react";
import { differenceInDays, startOfDay } from "date-fns";
import { useCompetitionStore } from "../stores/useCompetitionStore";
import type { Competition } from "../types";

interface ReminderInfo {
  competition: Competition;
  daysUntil: number;
}

/**
 * Hook to check for upcoming competition reminders.
 * Uses Tauri notification API (placeholder for now).
 *
 * TODO: Implement actual notification system using @tauri-apps/plugin-notification
 */
export function useReminders() {
  const { competitions } = useCompetitionStore();

  // Get competitions that need reminders today
  const getRemindersForToday = useCallback((): ReminderInfo[] => {
    const today = startOfDay(new Date());
    const reminders: ReminderInfo[] = [];

    for (const competition of competitions) {
      if (!competition.reminderEnabled || !competition.reminderDaysBefore) {
        continue;
      }

      const competitionDate = startOfDay(new Date(competition.date));
      const daysUntil = differenceInDays(competitionDate, today);

      // Check if today is the reminder day
      if (daysUntil === competition.reminderDaysBefore) {
        reminders.push({
          competition,
          daysUntil,
        });
      }
    }

    return reminders;
  }, [competitions]);

  // Get all upcoming competitions with reminders
  const getUpcomingReminders = useCallback((): ReminderInfo[] => {
    const today = startOfDay(new Date());
    const reminders: ReminderInfo[] = [];

    for (const competition of competitions) {
      if (!competition.reminderEnabled || !competition.reminderDaysBefore) {
        continue;
      }

      const competitionDate = startOfDay(new Date(competition.date));
      const daysUntil = differenceInDays(competitionDate, today);

      // Only include future competitions where reminder hasn't passed
      if (daysUntil >= 0 && daysUntil <= competition.reminderDaysBefore) {
        reminders.push({
          competition,
          daysUntil,
        });
      }
    }

    return reminders.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [competitions]);

  // Send notification (placeholder)
  const sendNotification = useCallback(async (reminder: ReminderInfo) => {
    // TODO: Implement using @tauri-apps/plugin-notification
    // import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
    //
    // const permissionGranted = await isPermissionGranted();
    // if (!permissionGranted) {
    //   const permission = await requestPermission();
    //   if (permission !== 'granted') return;
    // }
    //
    // await sendNotification({
    //   title: 'Tuleva kilpailu',
    //   body: `${reminder.competition.name} on ${reminder.daysUntil} päivän päästä`,
    // });

    console.log(
      `[Reminder] ${reminder.competition.name} is in ${reminder.daysUntil} days`
    );
  }, []);

  // Check reminders on mount and periodically
  useEffect(() => {
    const checkReminders = () => {
      const todayReminders = getRemindersForToday();

      for (const reminder of todayReminders) {
        sendNotification(reminder);
      }
    };

    // Check on mount
    checkReminders();

    // Check every hour
    const interval = setInterval(checkReminders, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [getRemindersForToday, sendNotification]);

  return {
    getRemindersForToday,
    getUpcomingReminders,
    sendNotification,
  };
}
