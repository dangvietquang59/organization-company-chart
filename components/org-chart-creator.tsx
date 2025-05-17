"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Tree, TreeNode } from "react-organizational-chart"
import {
  PlusCircle,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Download,
  FileImage,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize,
  Printer,
} from "lucide-react"
import { toPng, toJpeg } from "html-to-image"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

// Tạo ID ngẫu nhiên
const generateId = () => Math.random().toString(36).substring(2, 9)

// Cập nhật interface OrgNode để bỏ iconType và thêm imageFile
export interface OrgNodeData {
  id: string
  title: string
  description: string
  imageUrl: string
  expanded: boolean
  children: OrgNodeData[]
  stats?: string
  position?: { x: number; y: number }
}

// Cập nhật dữ liệu mẫu ban đầu, bỏ iconType
const initialData: OrgNodeData = {
  id: generateId(),
  title: "Công Ty ABC",
  description: "Trụ sở chính",
  imageUrl: "",
  expanded: true,
  children: [],
  stats: "",
}

export default function OrgChartCreator() {
  // Thêm state để quản lý zoom
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 })
  const [chartPosition, setChartPosition] = useState({ x: 0, y: 0 })
  const [orgData, setOrgData] = useState<OrgNodeData>(initialData)
  const [selectedNode, setSelectedNode] = useState<OrgNodeData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<OrgNodeData>>({})
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"json" | "png" | "pdf">("json")
  const [showImages, setShowImages] = useState(true)
  const chartRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Tìm node theo ID
  const findNodeById = (nodes: OrgNodeData, id: string): OrgNodeData | null => {
    if (nodes.id === id) return nodes

    if (nodes.children) {
      for (const child of nodes.children) {
        const found = findNodeById(child, id)
        if (found) return found
      }
    }

    return null
  }

  // Cập nhật node
  const updateNode = (nodes: OrgNodeData, id: string, updates: Partial<OrgNodeData>): OrgNodeData => {
    if (nodes.id === id) {
      return { ...nodes, ...updates }
    }

    return {
      ...nodes,
      children: nodes.children.map((child) => updateNode(child, id, updates)),
    }
  }

  // Thêm node con
  const addChildNode = (parentId: string) => {
    const newNode: OrgNodeData = {
      id: generateId(),
      title: "Node mới",
      description: "Mô tả node",
      imageUrl: "",
      expanded: true,
      children: [],
      stats: "",
    }

    const updatedData = updateNode(orgData, parentId, {
      children: [...(findNodeById(orgData, parentId)?.children || []), newNode],
    })

    setOrgData(updatedData)
  }

  // Xóa node
  const deleteNode = (nodes: OrgNodeData, id: string): OrgNodeData | null => {
    // Không cho phép xóa node gốc
    if (nodes.id === initialData.id && id === initialData.id) {
      return nodes
    }

    // Lọc ra các node con không bị xóa
    const filteredChildren = nodes.children.map((child) => deleteNode(child, id)).filter(Boolean) as OrgNodeData[]

    // Nếu node hiện tại là node cần xóa, trả về null
    if (nodes.id === id) {
      return null
    }

    // Trả về node với danh sách con đã được cập nhật
    return {
      ...nodes,
      children: filteredChildren,
    }
  }

  // Xử lý xóa node
  const handleDeleteNode = (id: string) => {
    // Không cho phép xóa node gốc
    if (id === initialData.id) return

    const result = deleteNode(orgData, id)
    if (result) {
      setOrgData(result)
      if (selectedNode?.id === id) {
        setSelectedNode(null)
        setIsEditing(false)
      }
    }
  }

  // Trong hàm handleEditNode, bỏ iconType
  const handleEditNode = (node: OrgNodeData) => {
    setSelectedNode(node)
    setEditData({
      title: node.title,
      description: node.description,
      imageUrl: node.imageUrl,
      stats: node.stats,
    })
    setIsEditing(true)
  }

  // Lưu thay đổi
  const handleSaveEdit = () => {
    if (selectedNode) {
      const updatedData = updateNode(orgData, selectedNode.id, editData)
      setOrgData(updatedData)
      setIsEditing(false)
    }
  }

  // Chuyển đổi trạng thái mở rộng của node
  const toggleNodeExpand = (id: string) => {
    const node = findNodeById(orgData, id)
    if (node) {
      const updatedData = updateNode(orgData, id, { expanded: !node.expanded })
      setOrgData(updatedData)
    }
  }

  // Xuất dữ liệu dưới dạng JSON
  const exportAsJson = () => {
    const dataStr = JSON.stringify(orgData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = "organization-chart.json"

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()

    setExportOpen(false)

    toast({
      title: "Thành công",
      description: "Đã xuất dữ liệu dưới dạng JSON",
    })
  }

  // Phương pháp đơn giản để in sơ đồ
  const printChart = () => {
    // Lưu trạng thái hiện tại để khôi phục sau khi in (nếu cần)
    const currentZoom = zoomLevel
    const currentPosition = { ...chartPosition }

    // Giữ nguyên zoom hiện tại để in đúng kích thước người dùng mong muốn

    // Đợi DOM cập nhật
    setTimeout(() => {
      // Tạo một iframe tạm thời để in
      const iframe = document.createElement("iframe")
      iframe.style.position = "absolute"
      iframe.style.top = "-9999px"
      document.body.appendChild(iframe)

      // Lấy nội dung sơ đồ
      const chartContainer = chartRef.current
      if (!chartContainer) {
        document.body.removeChild(iframe)
        setZoomLevel(currentZoom)
        setChartPosition(currentPosition)
        return
      }

      // Tạo một bản sao của sơ đồ để in
      const chartClone = chartContainer.cloneNode(true) as HTMLElement
      chartClone.style.overflow = "visible"
      chartClone.style.height = "auto"
      chartClone.style.width = "100%"
      chartClone.style.position = "static"
      // Giữ nguyên transform để duy trì mức zoom của người dùng
      const chartContent = chartClone.querySelector('div');
      if (chartContent) {
        chartContent.style.transform = `scale(${zoomLevel}) translate(${chartPosition.x}px, ${chartPosition.y}px)`;
      }
      chartClone.style.background = "white"

      // Tạo tài liệu HTML cho iframe
      const iframeDoc = iframe.contentDocument
      if (!iframeDoc) {
        document.body.removeChild(iframe)
        setZoomLevel(currentZoom)
        setChartPosition(currentPosition)
        return
      }

      // Thêm style vào iframe
      const style = iframeDoc.createElement("style")
      style.textContent = `
        body { margin: 0; padding: 20px; background: white; }
        .org-chart-container { background: white; padding: 20px; }
        .react-organizational-chart { background: white; }
      `
      iframeDoc.head.appendChild(style)

      // Thêm nội dung vào iframe
      iframeDoc.body.appendChild(chartClone)

      // In iframe
      iframe.onload = () => {
        iframe.contentWindow?.print()

        // Xóa iframe sau khi in
        setTimeout(() => {
          document.body.removeChild(iframe)
          // Khôi phục zoom và vị trí
          setZoomLevel(currentZoom)
          setChartPosition(currentPosition)
        }, 1000)
      }

      // Khôi phục zoom và vị trí nếu có lỗi
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
          setZoomLevel(currentZoom)
          setChartPosition(currentPosition)
        }
      }, 5000)
    }, 300)
  }

  // Phương pháp đơn giản để xuất ảnh
  const exportAsSimpleImage = () => {
    setIsExporting(true)
    toast({
      title: "Đang xử lý",
      description: "Đang chuẩn bị xuất hình ảnh, vui lòng đợi...",
    })

    // Lưu trạng thái hiện tại
    const currentZoom = zoomLevel
    const currentPosition = { ...chartPosition }

    // Đợi DOM cập nhật
    setTimeout(() => {
      try {
        // Lấy phần tử chứa sơ đồ
        const chartContainer = chartRef.current?.querySelector('.org-chart-container')
        if (!chartContainer) throw new Error("Không tìm thấy sơ đồ")

        // Lưu trữ style ban đầu để khôi phục sau khi xuất
        const originalDisplay = document.body.style.display
        const originalOverflow = document.body.style.overflow
        const originalZoom = (chartContainer as HTMLElement).style.transform
        const originalButtons = Array.from(chartContainer.querySelectorAll('button')).map(
          btn => ({ elem: btn, display: btn.style.display })
        )
        const originalMenus = Array.from(chartContainer.querySelectorAll('.dropdown-menu')).map(
          menu => ({ elem: menu, display: (menu as HTMLElement).style.display })
        )

        // Ẩn tạm thời các phần tử không liên quan
        document.body.style.overflow = 'hidden'
        originalButtons.forEach(item => item.elem.style.display = 'none')
        originalMenus.forEach(item => (item.elem as HTMLElement).style.display = 'none')
        ;(chartContainer as HTMLElement).style.transform = 'none'

        // Sử dụng html-to-image để tạo hình ảnh
        toPng(chartContainer as HTMLElement, {
          backgroundColor: "#fff",
          quality: 1,
          pixelRatio: 2,
          width: chartContainer.scrollWidth,
          height: chartContainer.scrollHeight,
          style: {
            padding: '30px',
            background: 'white'
          }
        })
        .then((dataUrl) => {
          // Tạo link tải xuống
          const link = document.createElement("a")
          link.download = "organization-chart.png"
          link.href = dataUrl
          link.click()

          toast({
            title: "Thành công",
            description: "Đã xuất dữ liệu dưới dạng hình ảnh PNG",
          })
        })
        .catch((error) => {
          console.error("Lỗi khi xuất hình ảnh:", error)
          toast({
            title: "Lỗi",
            description: "Không thể xuất hình ảnh. Vui lòng thử phương pháp khác.",
            variant: "destructive",
          })
        })
        .finally(() => {
          // Khôi phục các phần tử về trạng thái ban đầu
          document.body.style.display = originalDisplay
          document.body.style.overflow = originalOverflow
          ;(chartContainer as HTMLElement).style.transform = originalZoom
          originalButtons.forEach(item => item.elem.style.display = item.display)
          originalMenus.forEach(item => (item.elem as HTMLElement).style.display = item.display)
          setIsExporting(false)
        })
      } catch (error) {
        console.error("Lỗi khi xuất hình ảnh:", error)
        toast({
          title: "Lỗi",
          description: "Không thể xuất hình ảnh. Vui lòng thử phương pháp khác.",
          variant: "destructive",
        })
        setIsExporting(false)
      }
    }, 300)
  }

  // Phương pháp đơn giản để xuất PDF
  const exportAsSimplePdf = () => {
    setIsExporting(true)
    toast({
      title: "Đang xử lý",
      description: "Đang chuẩn bị xuất PDF, vui lòng đợi...",
    })

    // Lưu trạng thái hiện tại
    const currentZoom = zoomLevel
    const currentPosition = { ...chartPosition }

    // Đợi DOM cập nhật
    setTimeout(() => {
      try {
        // Lấy phần tử chứa sơ đồ
        const chartContainer = chartRef.current?.querySelector('.org-chart-container')
        if (!chartContainer) throw new Error("Không tìm thấy sơ đồ")

        // Lưu trữ style ban đầu để khôi phục sau khi xuất
        const originalDisplay = document.body.style.display
        const originalOverflow = document.body.style.overflow
        const originalZoom = (chartContainer as HTMLElement).style.transform
        const originalButtons = Array.from(chartContainer.querySelectorAll('button')).map(
          btn => ({ elem: btn, display: btn.style.display })
        )
        const originalMenus = Array.from(chartContainer.querySelectorAll('.dropdown-menu')).map(
          menu => ({ elem: menu, display: (menu as HTMLElement).style.display })
        )

        // Ẩn tạm thời các phần tử không liên quan
        document.body.style.overflow = 'hidden'
        originalButtons.forEach(item => item.elem.style.display = 'none')
        originalMenus.forEach(item => (item.elem as HTMLElement).style.display = 'none')
        ;(chartContainer as HTMLElement).style.transform = 'none'

        // Sử dụng html-to-image để tạo hình ảnh
        toJpeg(chartContainer as HTMLElement, {
          backgroundColor: "#fff",
          quality: 0.95,
          pixelRatio: 2,
          width: chartContainer.scrollWidth,
          height: chartContainer.scrollHeight,
          style: {
            padding: '30px',
            background: 'white'
          }
        })
        .then((dataUrl) => {
          // Tạo tài liệu PDF
          const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
          })

          // Tính toán kích thước để vừa với trang PDF
          const imgProps = pdf.getImageProperties(dataUrl)
          const pdfWidth = pdf.internal.pageSize.getWidth()
          const pdfHeight = pdf.internal.pageSize.getHeight()
          const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height)
          const imgWidth = imgProps.width * ratio
          const imgHeight = imgProps.height * ratio
          const x = (pdfWidth - imgWidth) / 2
          const y = (pdfHeight - imgHeight) / 2

          // Thêm hình ảnh vào PDF
          pdf.addImage(dataUrl, "JPEG", x, y, imgWidth, imgHeight)

          // Lưu PDF
          pdf.save("organization-chart.pdf")

          toast({
            title: "Thành công",
            description: "Đã xuất dữ liệu dưới dạng PDF",
          })
        })
        .catch((error) => {
          console.error("Lỗi khi xuất PDF:", error)
          toast({
            title: "Lỗi",
            description: "Không thể xuất PDF. Vui lòng thử phương pháp khác.",
            variant: "destructive",
          })
        })
        .finally(() => {
          // Khôi phục các phần tử về trạng thái ban đầu
          document.body.style.display = originalDisplay
          document.body.style.overflow = originalOverflow
          ;(chartContainer as HTMLElement).style.transform = originalZoom
          originalButtons.forEach(item => item.elem.style.display = item.display)
          originalMenus.forEach(item => (item.elem as HTMLElement).style.display = item.display)
          setIsExporting(false)
        })
      } catch (error) {
        console.error("Lỗi khi xuất PDF:", error)
        toast({
          title: "Lỗi",
          description: "Không thể xuất PDF. Vui lòng thử phương pháp khác.",
          variant: "destructive",
        })
        setIsExporting(false)
      }
    }, 300)
  }

  // Phương pháp xuất hình ảnh trực tiếp
  const exportAsCanvas = () => {
    setIsExporting(true)
    toast({
      title: "Đang xử lý",
      description: "Đang chuẩn bị xuất hình ảnh, vui lòng đợi...",
    })

    setTimeout(() => {
      try {
        // Lấy phần tử chứa sơ đồ
        const orgChartContainer = chartRef.current?.querySelector('.org-chart-container')
        if (!orgChartContainer) throw new Error("Không tìm thấy container sơ đồ")

        // Sử dụng html-to-image với các tùy chọn đặc biệt
        toPng(orgChartContainer as HTMLElement, {
          backgroundColor: '#ffffff',
          quality: 1,
          pixelRatio: 2,
          canvasWidth: orgChartContainer.clientWidth + 100, // Thêm padding
          canvasHeight: orgChartContainer.clientHeight + 100,
          skipFonts: true, // Bỏ qua fonts để tránh lỗi CORS
          filter: (node) => {
            // Lọc ra các phần tử UI không cần thiết
            const element = node as HTMLElement
            const isButton = element.tagName === 'BUTTON'
            const isDropdown = element.classList?.contains('dropdown-menu')
            
            return !(isButton || isDropdown)
          },
        })
        .then((dataUrl) => {
          // Tạo link tải xuống
          const link = document.createElement('a')
          link.download = 'organization-chart.png'
          link.href = dataUrl
          link.click()
          
          toast({
            title: "Thành công",
            description: "Đã xuất dữ liệu dưới dạng hình ảnh PNG",
          })
        })
        .catch((error) => {
          console.error("Lỗi khi xuất hình ảnh:", error)
          toast({
            title: "Lỗi",
            description: "Không thể xuất hình ảnh: " + error.message,
            variant: "destructive",
          })
        })
        .finally(() => {
          setIsExporting(false)
        })
      } catch (error) {
        console.error("Lỗi khi chuẩn bị xuất hình ảnh:", error)
        toast({
          title: "Lỗi",
          description: "Không thể chuẩn bị xuất hình ảnh: " + (error as Error).message,
          variant: "destructive",
        })
        setIsExporting(false)
      }
    }, 300)
  }
  
  // Phương pháp xuất PDF đơn giản sử dụng window.print()
  const exportAsPrintPdf = () => {
    setIsExporting(true)
    toast({
      title: "Đang xử lý",
      description: "Đang chuẩn bị xuất PDF, vui lòng đợi...",
    })

    // Lưu trạng thái hiện tại
    const currentZoom = zoomLevel
    const currentPosition = { ...chartPosition }
    
    // Đặt lại zoom và vị trí cho việc in
    setZoomLevel(1)
    setChartPosition({ x: 0, y: 0 })

    // Thêm CSS cho việc in
    const style = document.createElement('style')
    style.id = 'print-style'
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        .org-chart-container, .org-chart-container * {
          visibility: visible;
        }
        .org-chart-container button, .org-chart-container .dropdown-menu {
          display: none !important;
        }
        .org-chart-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: auto;
          padding: 30px;
          background: white;
        }
      }
    `
    document.head.appendChild(style)

    // Đợi DOM cập nhật
    setTimeout(() => {
      try {
        // Mở cửa sổ in
        window.print()
        
        // Đợi để cửa sổ in đóng
        setTimeout(() => {
          // Xóa style in
          const printStyle = document.getElementById('print-style')
          if (printStyle) document.head.removeChild(printStyle)
          
          // Khôi phục zoom và vị trí
          setZoomLevel(currentZoom)
          setChartPosition(currentPosition)
          setIsExporting(false)
          
          toast({
            title: "Thành công", 
            description: "Đã mở cửa sổ in. Bạn có thể lưu dưới dạng PDF từ cửa sổ in.",
          })
        }, 1000)
      } catch (error) {
        console.error("Lỗi khi xuất PDF:", error)
        
        // Xóa style in
        const printStyle = document.getElementById('print-style')
        if (printStyle) document.head.removeChild(printStyle)
        
        // Khôi phục zoom và vị trí
        setZoomLevel(currentZoom)
        setChartPosition(currentPosition)
        
        toast({
          title: "Lỗi",
          description: "Không thể xuất PDF: " + (error as Error).message,
          variant: "destructive",
        })
        setIsExporting(false)
      }
    }, 300)
  }

  // Xử lý xuất dữ liệu theo định dạng đã chọn
  const handleExport = () => {
    switch (exportFormat) {
      case "json":
        exportAsJson()
        break
      case "png":
        exportAsCanvas() // Sử dụng phương pháp canvas mới
        break
      case "pdf":
        exportAsPrintPdf() // Sử dụng phương pháp in mới
        break
      default:
        exportAsJson()
    }
  }

  // Nhập dữ liệu từ file JSON
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        setOrgData(importedData)

        toast({
          title: "Thành công",
          description: "Đã nhập dữ liệu",
        })
      } catch (error) {
        console.error("Lỗi khi nhập dữ liệu:", error)
        toast({
          title: "Lỗi",
          description: "File không hợp lệ. Vui lòng chọn file JSON đúng định dạng.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)

    // Reset input để có thể chọn lại cùng một file
    event.target.value = ""
    setExportOpen(false)
  }

  // Thay đổi hàm renderNode để bỏ biểu tượng và hiển thị hình ảnh tốt hơn
  const renderNode = (node: OrgNodeData) => {
    return (
      <TreeNode
        key={node.id}
        label={
          <div className="relative group node-container">
            <Card className="p-3 min-w-[200px] max-w-[220px] border-2 hover:border-primary transition-colors">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm truncate">{node.title}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditNode(node)}>Chỉnh sửa</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addChildNode(node.id)}>Thêm node con</DropdownMenuItem>
                      {node.id !== initialData.id && (
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteNode(node.id)}>
                          Xóa
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {showImages && node.imageUrl ? (
                  <div className="mb-2 w-full">
                    <img
                      src={node.imageUrl || "/placeholder.svg"}
                      alt={node.title}
                      className="w-full h-24 object-cover rounded-md"
                    />
                  </div>
                ) : showImages ? (
                  <div className="mb-2 w-full h-24 bg-slate-100 rounded-md flex items-center justify-center text-slate-400 text-xs">
                    Chưa có hình ảnh
                  </div>
                ) : null}

                {node.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{node.description}</p>
                )}

                {node.stats && <div className="mt-2 text-xs font-medium text-primary">{node.stats}</div>}
              </div>

              {node.children.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 h-5 w-5 rounded-full bg-background border"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleNodeExpand(node.id)
                  }}
                >
                  {node.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              )}
            </Card>
          </div>
        }
      >
        {node.expanded && node.children.map((child) => renderNode(child))}
      </TreeNode>
    )
  }

  // Thêm hàm để căn giữa sơ đồ sau khi render
  useEffect(() => {
    if (chartRef.current) {
      const centerChart = () => {
        const chartContainer = chartRef.current
        if (chartContainer) {
          const chartWidth = chartContainer.scrollWidth
          const containerWidth = chartContainer.clientWidth
          if (chartWidth > containerWidth) {
            chartContainer.scrollLeft = (chartWidth - containerWidth) / 2
          }
        }
      }

      // Căn giữa sau khi render
      centerChart()

      // Thêm sự kiện resize để căn giữa khi thay đổi kích thước cửa sổ
      window.addEventListener("resize", centerChart)
      return () => {
        window.removeEventListener("resize", centerChart)
      }
    }
  }, [orgData])

  // Thêm hàm xử lý zoom
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5))
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
    setChartPosition({ x: 0, y: 0 })
  }

  // Thêm hàm xử lý panning (kéo sơ đồ)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      // Chỉ xử lý chuột trái
      setIsPanning(true)
      setStartPanPosition({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - startPanPosition.x
      const deltaY = e.clientY - startPanPosition.y
      setChartPosition((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }))
      setStartPanPosition({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-4 mb-6 justify-between">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => addChildNode(orgData.id)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Thêm Node
          </Button>

          <div className="flex items-center space-x-2">
            <Switch id="show-images" checked={showImages} onCheckedChange={setShowImages} />
            <Label htmlFor="show-images" className="flex items-center">
              <ImageIcon className="h-4 w-4 mr-2" />
              Hiển thị hình ảnh
            </Label>
          </div>


          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Chỉnh sửa Node</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Tiêu đề
                  </label>
                  <Input
                    id="title"
                    value={editData.title || ""}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Mô tả
                  </label>
                  <Textarea
                    id="description"
                    value={editData.description || ""}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Thay đổi phần dialog chỉnh sửa để thêm chức năng tải lên hình ảnh */}
                {/* Thay thế phần input URL hình ảnh trong dialog chỉnh sửa */}
                <div className="grid gap-2">
                  <label htmlFor="imageUpload" className="text-sm font-medium">
                    Hình ảnh
                  </label>
                  <div className="grid gap-2">
                    {editData.imageUrl ? (
                      <div className="relative w-full h-32 mb-2">
                        <img
                          src={editData.imageUrl || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-md"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => setEditData({ ...editData, imageUrl: "" })}
                        >
                          Xóa
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-slate-100 rounded-md flex items-center justify-center text-slate-400 mb-2">
                        Chưa có hình ảnh
                      </div>
                    )}
                    <Input
                      id="imageUrl"
                      type="url"
                      value={editData.imageUrl || ""}
                      onChange={(e) => setEditData({ ...editData, imageUrl: e.target.value })}
                      placeholder="Nhập URL hình ảnh"
                      className="mb-2"
                    />
                    <p className="text-xs text-muted-foreground mb-1">hoặc tải lên hình ảnh từ máy tính:</p>
                    <Input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            setEditData({ ...editData, imageUrl: event.target?.result as string })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="stats" className="text-sm font-medium">
                    Thông tin thống kê (tùy chọn)
                  </label>
                  <Input
                    id="stats"
                    value={editData.stats || ""}
                    onChange={(e) => setEditData({ ...editData, stats: e.target.value })}
                    placeholder="Ví dụ: 180 Plans"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Hủy
                </Button>
                <Button onClick={handleSaveEdit}>Lưu thay đổi</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
          <span className="text-xs font-medium mx-1">{Math.round(zoomLevel * 100)}%</span>

          <Button variant="outline" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4 mr-2" />
            Phóng to
          </Button>

          <Button variant="outline" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4 mr-2" />
            Thu nhỏ
          </Button>
          </div>
          <Button variant="outline" onClick={handleResetZoom}>
            <Maximize className="h-4 w-4 mr-2" />
            Đặt lại
          </Button>
        
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Xuất/Nhập dữ liệu</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Xuất/Nhập dữ liệu</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="export">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="export">Xuất dữ liệu</TabsTrigger>
                  <TabsTrigger value="import">Nhập dữ liệu</TabsTrigger>
                </TabsList>
                <TabsContent value="export" className="py-4">
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Chọn định dạng xuất</label>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="json"
                            name="exportFormat"
                            value="json"
                            checked={exportFormat === "json"}
                            onChange={() => setExportFormat("json")}
                            className="h-4 w-4"
                          />
                          <label htmlFor="json" className="flex items-center text-sm">
                            <Download className="h-4 w-4 mr-2" />
                            JSON (để lưu trữ và nhập lại)
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="png"
                            name="exportFormat"
                            value="png"
                            checked={exportFormat === "png"}
                            onChange={() => setExportFormat("png")}
                            className="h-4 w-4"
                          />
                          <label htmlFor="png" className="flex items-center text-sm">
                            <FileImage className="h-4 w-4 mr-2" />
                            Hình ảnh PNG
                          </label>
                        </div>
                       
                      </div>
                    </div>
                    <Button onClick={handleExport} className="w-full mt-4" disabled={isExporting}>
                      {isExporting ? "Đang xử lý..." : "Xuất dữ liệu"}
                    </Button>
                   
                  </div>
                </TabsContent>
                <TabsContent value="import" className="py-4">
                  <p className="text-sm text-muted-foreground mb-4">Nhập sơ đồ tổ chức từ file JSON đã lưu trước đó.</p>
                  <div className="grid gap-2">
                    <label htmlFor="import-file" className="text-sm font-medium">
                      Chọn file JSON
                    </label>
                    <Input id="import-file" type="file" accept=".json" onChange={importData} />
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cập nhật phần hiển thị sơ đồ để áp dụng zoom và panning */}
      {/* Thay đổi phần div chứa sơ đồ */}
      <div
        className="overflow-auto p-4 border rounded-lg bg-slate-50 min-h-[500px]"
        ref={chartRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
      >
        <div
          className="flex justify-center"
          style={{
            transform: `scale(${zoomLevel}) translate(${chartPosition.x}px, ${chartPosition.y}px)`,
            transformOrigin: "center",
            transition: "transform 0.1s ease",
          }}
        >
                    <div className="org-chart-container">
              {/* Tree component with required props */}
              <Tree
                label={<div />}
                lineWidth="2px"
                lineColor="#d1d5db"
                lineBorderRadius="10px"
                nodePadding="5px"
              >
                {renderNode(orgData)}
              </Tree>
            </div>
        </div>
      </div>

      <Toaster />
    </div>
  )
}
