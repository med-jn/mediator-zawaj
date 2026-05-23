import { cookies }   from 'next/headers';
import { redirect }  from 'next/navigation';

export default async function Home() {
  const cookieStore = await cookies();
  const role = cookieStore.get('user_role')?.value;

  if (role === 'mediator') redirect('/agent');
  redirect('/mediators');
}