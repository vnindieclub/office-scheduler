"use server";

import "server-only";
const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2025-09-03",
});

const dataSourceCache = new Map<string, string>();

const TEAM_IDS: Record<string, { config: string; submit: string }> = {
  "VietQ Media": { config: process.env.VIETQ_CONFIG_ID!, submit: process.env.SUBMISSION_DB_ID! },
  "No Headliner": { config: process.env.NOHEADLINER_CONFIG_ID!, submit: process.env.SUBMISSION_DB_ID! },
  "Vietnam Indie Club": { config: process.env.VIC_CONFIG_ID!, submit: process.env.SUBMISSION_DB_ID! },
};

async function getDataSourceId(databaseId: string): Promise<string> {
  const cached = dataSourceCache.get(databaseId);
  if (cached) return cached;
  const db = (await notion.request({ method: "get", path: `databases/${databaseId}` })) as any;
  const dataSourceId = db?.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error(`No data_sources for ${databaseId}`);
  dataSourceCache.set(databaseId, dataSourceId);
  return dataSourceId;
}

export async function getConfigFromNotion(teamName: string) {
  try {
    const ids = TEAM_IDS[teamName];
    if (!ids?.config) return [];
    const dataSourceId = await getDataSourceId(ids.config);
    const result = (await notion.dataSources.query({ data_source_id: dataSourceId })) as any;
    
    return result.results.map((page: any) => {
      const day = page.properties?.["Select"]?.select?.name ?? ""; // Matches Notion
      const timeRange = page.properties?.["Time Slot"]?.select?.name ?? "";
const hourPart = timeRange.split("h")[0]; // "10"
const startTime = `${hourPart}h`; // "10h"

return {
  id: `${day}-${startTime}`, 
        type: page.properties?.Type?.select?.name ?? "Nghỉ",
        label: page.properties?.Label?.rich_text?.[0]?.plain_text ?? "",
      };
    });
  } catch (e) {
    console.error("Config Error:", e);
    return [];
  }
}

// 1. Updated getStaffList using the Data Source pattern
export async function getStaffList(teamName: string) {
  try {
    const dbId = process.env.NOTION_STAFF_DB_ID!;
    const dsId = await getDataSourceId(dbId);
    
    // Use dataSources.query instead of databases.query
    const response = (await notion.dataSources.query({ data_source_id: dsId })) as any;

    return response.results
      .filter((page: any) => {
        // Data Sources sometimes store Select names differently; manual filter is safer
        const teams = page.properties?.Team?.multi_select || [];
        return teams.some((t: any) => t.name === teamName);
      })
      .map((page: any) => ({
        name: page.properties?.Name?.title[0]?.plain_text || "Unknown",
        email: page.properties?.Email?.email || "",
        commitHours: page.properties?.["Commit Hours"]?.number || 0,
      }));
  } catch (error) {
    console.error("Staff List Error:", error);
    return [];
  }
}

export async function submitSchedule(teamName: string, input: any, imgBase64: string) {
  try {
    const ids = TEAM_IDS[teamName];
    if (!ids?.submit) return { success: false, error: "Missing Database ID" };
    
    const dsId = await getDataSourceId(ids.submit);

    // --- 1. SEARCH FOR EXISTING ENTRIES ---
    // We query the Data Source to find any existing rows for this person on this date
    const existing = (await notion.dataSources.query({ 
      data_source_id: dsId 
    })) as any;

    const toDelete = existing.results.filter((p: any) => {
      // We check Name (Title) and Date properties
      const nameInNotion = p.properties.Name?.title[0]?.plain_text;
      const dateInNotion = p.properties.Date?.date?.start;
      
      // If the name and date match the current submission, it's a duplicate
      return nameInNotion?.includes(input.userName) && dateInNotion === input.selectedDate;
    });

    // --- 2. EXECUTE THE OVERWRITE (ARCHIVE) ---
    // Notion doesn't 'delete', it 'archives'. This removes them from the view.
    if (toDelete.length > 0) {
      await Promise.all(toDelete.map((p: any) => 
        notion.pages.update({ 
          page_id: p.id, 
          archived: true 
        })
      ));
    }

    // --- 3. CREATE NEW ENTRIES ---
    // Define the Team property as Multi-select to match your Staff DB logic
    const teamProperty = { 
      multi_select: [{ name: teamName }] 
    };




    // Create the individual Shift rows
    const promises = input.allShifts.map((shift: any) => 
      notion.pages.create({
        parent: { data_source_id: dsId },
        properties: {
          "Name": { title: [{ text: { content: input.userName } }] },
          "Day": { select: { name: shift.day } },
          "Time Slot": { select: { name: shift.time } },
          "Type": { select: { name: shift.type } },
          "Team": teamProperty,
          "Date": { date: { start: input.selectedDate } }
        }
      })
    );

    await Promise.all(promises);
    return { success: true };

  } catch (e: any) {
    console.error("Overwrite/Submit Error:", e);
    return { success: false, error: e.message };
  }
}