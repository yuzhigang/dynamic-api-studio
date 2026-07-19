import { Link } from '@tanstack/react-router'
import { TableCell, TableRow } from '@/components/ui/table'
import { ProjectFormDialog } from '@/modules/projects/components/project-form/project-form-dialog'
import { ProjectStatusBadge } from '@/modules/projects/components/project-list/project-status-badge'
import type { Project } from '@/shared/contracts/project.contract'

type ProjectTableRowProps = {
  project: Project
}

export function ProjectTableRow({ project }: ProjectTableRowProps) {
  return (
    <TableRow>
      <TableCell>
        <Link
          to="/projects/$projectId"
          params={{ projectId: project.id }}
          className="font-semibold text-slate-900 hover:text-primary"
        >
          {project.name}
        </Link>
        {project.description ? (
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{project.description}</p>
        ) : null}
      </TableCell>
      <TableCell>{project.code}</TableCell>
      <TableCell>
        <ProjectStatusBadge status={project.status} />
      </TableCell>
      <TableCell>{project.apiCount}</TableCell>
      <TableCell>{project.updatedAt}</TableCell>
      <TableCell className="text-right">
        <ProjectFormDialog
          mode="edit"
          triggerLabel="编辑"
          triggerVariant="ghost"
          initialValue={{
            id: project.id,
            code: project.code,
            name: project.name,
            description: project.description,
            icon: project.icon,
            color: project.color,
          }}
        />
      </TableCell>
    </TableRow>
  )
}
