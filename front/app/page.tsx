import { redirect } from 'next/navigation';

export default function AuthRootRedirect() {
  redirect('/login');
}
