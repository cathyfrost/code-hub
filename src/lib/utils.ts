import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {formatDate, formatDistanceToNowStrict} from "date-fns"
import { zhCN } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeDate(from: Date){
  const currentDate = new Date();

  if(currentDate.getTime() - from.getTime() < 24 * 60 * 60 * 1000){
    return formatDistanceToNowStrict(from, {addSuffix: true, locale: zhCN})
  } else {
    if(currentDate.getFullYear() === from.getFullYear()){
      return formatDate(from, "MMM d", {locale: zhCN});
    } else {
      return formatDate(from, "MMM d, yyyy", {locale: zhCN});
    }
  }
}

export function formatNumber(n: number): string{
  return Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(n);
}