import PlanningRunView from '@/components/planning/PlanningRunView';
export default async function Page({params}) {
  const {runId}=await params;
  return <PlanningRunView id={runId}/>;
}
