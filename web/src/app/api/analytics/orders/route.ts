import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getDemoAnalytics } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

interface OrderStat {
  user_id: string;
  order_count: number;
  total_amount: number;
  window_start: string;
  window_end: string;
}

export async function GET() {
  try {
    const [topUsers, revenueOverTime, volumeOverTime] = await Promise.all([
      query<OrderStat>(
        `SELECT user_id, SUM(order_count) as order_count, SUM(total_amount) as total_amount
         FROM user_order_stats
         GROUP BY user_id
         ORDER BY total_amount DESC
         LIMIT 20`
      ),
      query<{ window_start: string; total_amount: number }>(
        `SELECT window_start, SUM(total_amount) as total_amount
         FROM user_order_stats
         GROUP BY window_start
         ORDER BY window_start DESC
         LIMIT 60`
      ),
      query<{ window_start: string; order_count: number }>(
        `SELECT window_start, SUM(order_count) as order_count
         FROM user_order_stats
         GROUP BY window_start
         ORDER BY window_start DESC
         LIMIT 60`
      ),
    ]);

    if (topUsers.length === 0) {
      return NextResponse.json(getDemoAnalytics());
    }

    return NextResponse.json({
      topUsers: topUsers.map((u) => ({
        userId: u.user_id,
        orderCount: Number(u.order_count),
        totalAmount: Number(u.total_amount),
      })),
      revenueOverTime: revenueOverTime.reverse().map((r) => ({
        time: new Date(r.window_start).toLocaleTimeString(),
        value: Number(r.total_amount),
      })),
      volumeOverTime: volumeOverTime.reverse().map((r) => ({
        time: new Date(r.window_start).toLocaleTimeString(),
        value: Number(r.order_count),
      })),
    });
  } catch {
    return NextResponse.json(getDemoAnalytics());
  }
}
