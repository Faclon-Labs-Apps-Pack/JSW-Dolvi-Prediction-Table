import { NextRequest, NextResponse } from "next/server";
import { DataAccess } from "connector-userid-ts";

export async function POST(request: NextRequest) {
  try {
    const { startTime, endTime } = await request.json();

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "startTime and endTime are required" },
        { status: 400 }
      );
    }

    const userId = process.env.IOSENSE_USER_ID;
    const dataUrl = process.env.IOSENSE_DATA_URL;
    const dsUrl = process.env.IOSENSE_DS_URL;

    if (!userId || !dataUrl || !dsUrl) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const dataAccess = new DataAccess({
      userId,
      dataUrl,
      dsUrl,
      tz: "UTC",
    });

    const result = await dataAccess.dataQuery({
      deviceId: "JSWDLV_PREDICTION",
      sensorList: ["D6"],
      startTime,
      endTime,
      cal: true,
      alias: false,
      unix: false,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Prediction API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prediction data" },
      { status: 500 }
    );
  }
}
