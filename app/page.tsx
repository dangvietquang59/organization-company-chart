import OrgChartWrapper from "@/components/org-chart-wrapper"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Công Cụ Tạo Sơ Đồ Tổ Chức</h1>
      <OrgChartWrapper />
    </main>
  )
}
