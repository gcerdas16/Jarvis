import { useEffect, useState } from "react";
import { Card, Metric, Text, Grid, Title, BarChart } from "@tremor/react";

interface KPIs {
  totalProspects: number;
  totalEmailsSent: number;
  totalResponses: number;
  totalOpens: number;
  totalBounces: number;
  totalUnsubscribes: number;
  openRate: string;
  responseRate: string;
  bounceRate: string;
}

interface PipelineItem {
  status: string;
  count: number;
}

interface OverviewData {
  kpis: KPIs;
  pipeline: PipelineItem[];
  bySource: { sourceId: string; count: number }[];
  byType: { companyType: string; count: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/metrics/overview")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error);
        }
      })
      .catch(() => setError("No se pudo conectar con el API"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Text>Cargando métricas...</Text>;
  }

  if (error || !data) {
    return (
      <Card>
        <Text className="text-red-500">Error: {error || "Sin datos"}</Text>
      </Card>
    );
  }

  const { kpis, pipeline } = data;

  return (
    <div className="space-y-8">
      <Title>Dashboard</Title>

      <Grid numItemsMd={3} numItemsLg={4} className="gap-4">
        <Card decoration="top" decorationColor="blue">
          <Text>Prospectos</Text>
          <Metric>{kpis.totalProspects}</Metric>
        </Card>
        <Card decoration="top" decorationColor="green">
          <Text>Emails enviados</Text>
          <Metric>{kpis.totalEmailsSent}</Metric>
        </Card>
        <Card decoration="top" decorationColor="emerald">
          <Text>Respuestas</Text>
          <Metric>{kpis.totalResponses}</Metric>
          <Text className="text-sm">{kpis.responseRate}% tasa</Text>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <Text>Aperturas</Text>
          <Metric>{kpis.totalOpens}</Metric>
          <Text className="text-sm">{kpis.openRate}% tasa</Text>
        </Card>
        <Card decoration="top" decorationColor="red">
          <Text>Rebotes</Text>
          <Metric>{kpis.totalBounces}</Metric>
          <Text className="text-sm">{kpis.bounceRate}% tasa</Text>
        </Card>
        <Card decoration="top" decorationColor="gray">
          <Text>Desuscritos</Text>
          <Metric>{kpis.totalUnsubscribes}</Metric>
        </Card>
      </Grid>

      <Card>
        <Title>Pipeline de prospectos</Title>
        <BarChart
          className="mt-4 h-72"
          data={pipeline}
          index="status"
          categories={["count"]}
          colors={["blue"]}
          yAxisWidth={48}
        />
      </Card>
    </div>
  );
}
