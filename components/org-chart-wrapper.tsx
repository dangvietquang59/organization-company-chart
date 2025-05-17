"use client"

import dynamic from "next/dynamic"

const OrgChartCreator = dynamic(() => import("@/components/org-chart-creator"), {
  ssr: false,
})

export default function OrgChartWrapper() {
  return <OrgChartCreator />
}
