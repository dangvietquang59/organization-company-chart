"use client"

import type React from "react"

import { useState } from "react"
import { ChevronDown, ChevronUp, MoreVertical, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { OrgNodeData } from "./org-chart-creator"

interface OrgChartProps {
  data: OrgNodeData
  onSelectNode: (node: OrgNodeData) => void
  onAddChild: (nodeId: string) => void
  selectedNodeId?: string
  level?: number
}

export function OrgChart({ data, onSelectNode, onAddChild, selectedNodeId, level = 0 }: OrgChartProps) {
  const [expanded, setExpanded] = useState(true)

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(!expanded)
  }

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddChild(data.id)
  }

  const handleSelectNode = () => {
    onSelectNode(data)
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <Card
          className={`p-3 min-w-[220px] max-w-[220px] border-2 hover:border-primary transition-colors cursor-pointer ${
            selectedNodeId === data.id ? "border-primary" : ""
          }`}
          onClick={handleSelectNode}
        >
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm truncate">{data.title}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleAddChild}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm node con
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

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

          {data.children.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 h-5 w-5 rounded-full bg-background border"
              onClick={toggleExpand}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </Card>
      </div>

      {expanded && data.children.length > 0 && (
        <div className="mt-8 relative">
          <div className="absolute top-[-20px] left-1/2 w-[1px] h-[20px] bg-gray-300"></div>
          <div className="flex flex-wrap justify-center gap-8">
            {data.children.map((child) => (
              <div key={child.id} className="relative">
                <div className="absolute top-[-20px] left-1/2 w-[1px] h-[20px] bg-gray-300"></div>
                <OrgChart
                  data={child}
                  onSelectNode={onSelectNode}
                  onAddChild={onAddChild}
                  selectedNodeId={selectedNodeId}
                  level={level + 1}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
