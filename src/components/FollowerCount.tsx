"use client"

import UseFollowerInfo from "@/hooks/UseFollowerInfo";
import { FollowerInfo } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface FollowerCountProps{
    userId: string;
    initialState: FollowerInfo;
}

export default function FollowerCount({userId, initialState}: FollowerCountProps){
    const {data} = UseFollowerInfo(userId, initialState)

    return (
      <span>
        <span>
          <span className="font-semibold">{formatNumber(data.followers)}</span>{" "}
          位粉丝
        </span>
      </span>
    );
}