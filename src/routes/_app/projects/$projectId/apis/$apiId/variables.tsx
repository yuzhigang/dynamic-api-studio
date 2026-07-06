import { Navigate, useParams } from '@tanstack/react-router'

export function ProjectApiVariablesRouteComponent() {
  const { projectId = '' } = useParams({ strict: false }) as { projectId?: string }
  return <Navigate to="/projects/$projectId/settings" params={{ projectId }} replace />
}
