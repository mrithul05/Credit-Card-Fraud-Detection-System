import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'

export function NotFoundPage() { return <div className="page-container page-container--narrow"><PageHeader eyebrow="404" title="Page not found" description="The page you requested does not exist in this workflow." /><Link className="button button--primary" to="/dashboard">Return to dashboard</Link></div> }
