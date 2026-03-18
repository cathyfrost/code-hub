// ============================================
// 技能等级 API 接口
// src/app/api/skill-level/route.ts
//
// GET /api/skill-level - 计算并更新当前用户的技能等级
// ============================================

import { validateRequest } from "@/auth";
import { calculateUserSkillLevel } from "@/lib/recommendation";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const newLevel = await calculateUserSkillLevel(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { skillLevel: newLevel },
    });

    return Response.json({
      userId: user.id,
      skillLevel: newLevel,
    });
  } catch (error) {
    console.error("技能等级计算失败:", error);
    return Response.json({ error: "计算失败" }, { status: 500 });
  }
}