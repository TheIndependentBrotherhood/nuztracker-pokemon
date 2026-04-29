import RunPageClient from './RunPageClient';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [{ id: 'new' }];
}

export default function RunPage() {
  return <RunPageClient />;
}
