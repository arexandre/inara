import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// We use the admin client because this route might be hit by external apps (Google Calendar, Apple Calendar)
// without normal auth cookies. We could implement a token parameter (e.g. ?token=xyz) but for now it's public/unguessable.

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();

    // 1. Fetch Tasks with deadlines
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, due_date, deadline_time, status, description, created_at, profiles!tasks_assignee_id_fkey(username)")
      .not("status", "eq", "done")
      .not("due_date", "is", null);

    // 2. Fetch Events
    const { data: events } = await supabase
      .from("events")
      .select("id, title, date, created_at");

    let icsContent = 
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Inara Home System//Calendar Feed//PT-BR
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Inara - Tarefas e Eventos
X-WR-TIMEZONE:America/Sao_Paulo
`;

    if (tasks) {
      tasks.forEach(task => {
        const assign = (task.profiles as any)?.username || "Geral";
        const dueDateStr = task.due_date; // YYYY-MM-DD
        const timeStr = task.deadline_time || "12:00:00"; // Default noon if no time

        // Parse local time and convert to UTC for the ICS standard format (Z)
        const dateObj = new Date(`${dueDateStr}T${timeStr}-03:00`); 
        
        // Format to YYYYMMDDTHHmmssZ
        const dtstart = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        // Let's assume an hour duration
        const endObj = new Date(dateObj.getTime() + 60 * 60 * 1000);
        const dtend = endObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const dtstamp = new Date(task.created_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const uid = `${task.id}@inara.local`;

        icsContent += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${task.title} [${assign}]
DESCRIPTION:${task.description ? task.description.replace(/\n/g, '\\n') : "Tarefa da Inara"}
STATUS:CONFIRMED
END:VEVENT
`;
      });
    }

    if (events) {
      events.forEach(evt => {
        const dateObj = new Date(`${evt.date}T12:00:00-03:00`); 
        const dtstart = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endObj = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000); // 2h duration default
        const dtend = endObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const dtstamp = new Date(evt.created_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const uid = `${evt.id}@inara.local`;

        icsContent += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:🗓️ ${evt.title}
DESCRIPTION:Evento da Casa
STATUS:CONFIRMED
END:VEVENT
`;
      });
    }

    icsContent += `END:VCALENDAR`;

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="inara_calendar.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

  } catch (error) {
    console.error("Erro ao gerar ICS:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
