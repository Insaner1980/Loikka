import { useEffect, useCallback, useRef } from "react";
import { differenceInDays, startOfDay, format } from "date-fns";
import { fi } from "date-fns/locale";
import {
  sendNotification,
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { useCompetitionStore } from "../stores/useCompetitionStore";
import type { Competition } from "../types";

// Local storage key for tracking shown reminders
const SHOWN_REMINDERS_KEY = "loikka_shown_reminders";
const REMINDER_CLEANUP_DAYS = 60;
const REMINDER_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

interface ReminderInfo {
  competition: Competition;
  daysUntil: number;
}

interface ShownReminder {
  competitionId: number;
  reminderDate: string; // ISO date string (YYYY-MM-DD)
}

/**
 * Get the list of already shown reminders from localStorage
 */
function getShownReminders(): ShownReminder[] {
  try {
    const stored = localStorage.getItem(SHOWN_REMINDERS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return [];
}

/**
 * Mark a reminder as shown in localStorage
 */
function markReminderAsShown(competitionId: number, date: Date): void {
  const shown = getShownReminders();
  const reminderDate = format(date, "yyyy-MM-dd");

  // Check if already exists
  const exists = shown.some(
    (r) => r.competitionId === competitionId && r.reminderDate === reminderDate
  );

  if (!exists) {
    shown.push({ competitionId, reminderDate });
    // Clean up old entries
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - REMINDER_CLEANUP_DAYS);
    const cleaned = shown.filter(
      (r) => new Date(r.reminderDate) >= cutoff
    );
    localStorage.setItem(SHOWN_REMINDERS_KEY, JSON.stringify(cleaned));
  }
}

/**
 * Check if a reminder has already been shown
 */
function hasReminderBeenShown(competitionId: number, date: Date): boolean {
  const shown = getShownReminders();
  const reminderDate = format(date, "yyyy-MM-dd");
  return shown.some(
    (r) => r.competitionId === competitionId && r.reminderDate === reminderDate
  );
}

/**
 * Hook to check for upcoming competition reminders and send notifications.
 */
export function useReminders() {
  const { competitions, fetchCompetitions } = useCompetitionStore();
  const hasCheckedOnMount = useRef(false);

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

  // Send notification for a reminder
  const sendReminderNotification = useCallback(
    async (reminder: ReminderInfo): Promise<boolean> => {
      const today = startOfDay(new Date());

      // Check if already shown
      if (hasReminderBeenShown(reminder.competition.id, today)) {
        return false;
      }

      try {
        // Check permission
        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          const permission = await requestPermission();
          permissionGranted = permission === "granted";
        }

        if (!permissionGranted) {
          return false;
        }

        // Format the competition date nicely
        const competitionDate = new Date(reminder.competition.date);
        const dateStr = format(competitionDate, "EEEE d.M.", { locale: fi });

        // Build notification body
        let body = `${reminder.competition.name}`;
        if (reminder.competition.location) {
          body += ` - ${reminder.competition.location}`;
        }
        body += ` (${dateStr})`;

        if (reminder.daysUntil === 0) {
          body = `Tänään: ${body}`;
        } else if (reminder.daysUntil === 1) {
          body = `Huomenna: ${body}`;
        } else {
          body = `${reminder.daysUntil} päivän päästä: ${body}`;
        }

        // Send notification
        await sendNotification({
          title: "Tuleva kilpailu",
          body,
        });

        // Mark as shown
        markReminderAsShown(reminder.competition.id, today);

        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // Check all reminders and send notifications
  const checkAndSendReminders = useCallback(async (): Promise<number> => {
    const todayReminders = getRemindersForToday();
    let sentCount = 0;

    for (const reminder of todayReminders) {
      const sent = await sendReminderNotification(reminder);
      if (sent) {
        sentCount++;
      }
    }

    return sentCount;
  }, [getRemindersForToday, sendReminderNotification]);

  // Check reminders on mount and periodically
  useEffect(() => {
    // Only check once on mount after competitions are loaded
    if (competitions.length === 0 || hasCheckedOnMount.current) {
      return;
    }

    hasCheckedOnMount.current = true;

    // Small delay to ensure app is fully loaded
    const timeout = setTimeout(() => {
      checkAndSendReminders();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [competitions, checkAndSendReminders]);

  // Set up periodic checking (every hour)
  // Use ref to avoid recreating interval on every dependency change
  const checkAndSendRemindersRef = useRef(checkAndSendReminders);
  checkAndSendRemindersRef.current = checkAndSendReminders;

  const competitionsLengthRef = useRef(competitions.length);
  competitionsLengthRef.current = competitions.length;

  useEffect(() => {
    const interval = setInterval(() => {
      if (competitionsLengthRef.current > 0) {
        checkAndSendRemindersRef.current();
      }
    }, REMINDER_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []); // Empty deps - interval created once

  // Fetch competitions on mount if empty
  useEffect(() => {
    if (competitions.length === 0) {
      fetchCompetitions();
    }
  }, [competitions.length, fetchCompetitions]);

  return {
    getRemindersForToday,
    getUpcomingReminders,
    sendReminderNotification,
    checkAndSendReminders,
  };
}

/**
 * Check if notifications are supported and permission is granted
 */
export async function checkNotificationPermission(): Promise<{
  supported: boolean;
  granted: boolean;
}> {
  try {
    const granted = await isPermissionGranted();
    return { supported: true, granted };
  } catch {
    return { supported: false, granted: false };
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const result = await requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}
