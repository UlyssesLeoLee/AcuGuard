import { issues } from '@/lib/mock-data'; import { BoardPluginGroup, Plugin } from '@/components/plugins/PluginGroups';
const cols=['todo','in_progress','done'];
export default function Board(){return <BoardPluginGroup>{cols.map(c=><Plugin key={c} title={c.toUpperCase()}>{issues.filter(i=>i.status===c).map(i=><div className='border rounded p-2 text-sm' key={i.id}>{i.title}</div>)}</Plugin>)}</BoardPluginGroup>}
