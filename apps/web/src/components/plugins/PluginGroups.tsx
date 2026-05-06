export const Plugin = ({title,children}:{title:string;children:React.ReactNode}) => <section className='border rounded-lg p-3 space-y-2'><h3 className='font-semibold'>{title}</h3>{children}</section>;
export const IssuePluginGroup = ({children}:{children:React.ReactNode}) => <div className='space-y-3'>{children}</div>;
export const BoardPluginGroup = ({children}:{children:React.ReactNode}) => <div className='grid md:grid-cols-3 gap-3'>{children}</div>;
export const AIPluginGroup = ({children}:{children:React.ReactNode}) => <div className='space-y-3'>{children}</div>;
