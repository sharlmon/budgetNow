<template>
  <component :is="icons[name] ?? icons.sparkles" :size="size" :stroke-width="stroke" class="lc" />
</template>

<script setup lang="ts">
import { House, ArrowLeftRight, ChartPie, CreditCard, Plus, Settings, ChevronLeft, ChevronRight, ChevronDown, X, CalendarDays, ShoppingBag, PiggyBank, Wallet, ArrowDownLeft, ArrowUpRight, Lightbulb, TrendingUp, Check, Delete, Trash2, Sparkles, Undo2, Target, ReceiptText, Coins, Share, Download, Smartphone, ShieldCheck, SquarePlus, Plane, Car, GraduationCap, Laptop, Heart, Gift, Flag, Upload, CalendarClock, Repeat, SkipForward, ChevronUp } from 'lucide-vue-next'
const icons: Record<string, any> = { house: House, swap: ArrowLeftRight, chart: ChartPie, card: CreditCard, plus: Plus, settings: Settings, back: ChevronLeft, next: ChevronRight, down: ChevronDown, x: X, calendar: CalendarDays, bag: ShoppingBag, piggy: PiggyBank, wallet: Wallet, in: ArrowDownLeft, out: ArrowUpRight, bulb: Lightbulb, trend: TrendingUp, check: Check, backspace: Delete, trash: Trash2, sparkles: Sparkles, undo: Undo2, target: Target, receipt: ReceiptText, coins: Coins, share: Share, download: Download, phone: Smartphone, shield: ShieldCheck, addsquare: SquarePlus, plane: Plane, car: Car, grad: GraduationCap, laptop: Laptop, heart: Heart, gift: Gift, flag: Flag, upload: Upload, bill: CalendarClock, repeat: Repeat, skip: SkipForward, up: ChevronUp }
withDefaults(defineProps<{ name: string; size?: number; stroke?: number }>(), { size: 20, stroke: 2 })
</script>

<style scoped>
.lc { flex:none; display:block; }
</style>
