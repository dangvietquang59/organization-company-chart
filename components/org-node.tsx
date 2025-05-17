"use client"

import { memo } from "react"
import { Card } from "@/components/ui/card"

interface OrgNodeData {
  title: string
  description: string
  imageUrl: string
  stats?: string
}

interface OrgNodeProps {
  data: OrgNodeData
  isSelected: boolean
  onClick: () => void
}

export const OrgNode = memo(({ data, isSelected, onClick }: OrgNodeProps) => {
  return (
    <div className="org-node" onClick={onClick}>
      <Card
        className={`p-3 min-w-[200px] max-w-[220px] border-2 hover:border-primary transition-colors ${
          isSelected ? "border-primary" : ""
        }`}
      >
        <div className="flex flex-col">
          <h3 className="font-medium text-sm mb-2 truncate">{data.title}</h3>

          {data.imageUrl && (
            <div className="mb-2 w-full">
              <img
                src={data.imageUrl || "/placeholder.svg"}
                alt={data.title}
                className="w-full h-24 object-cover rounded-md"
              />
            </div>
          )}

          {data.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.description}</p>}

          {data.stats && <div className="mt-2 text-xs font-medium text-primary">{data.stats}</div>}
        </div>
      </Card>
    </div>
  )
})

OrgNode.displayName = "OrgNode"
