// app/(dashboard)/page.js

import { redirect } from 'next/navigation';

export default function DashboardGroupRootPage() {
  redirect('/dashboard');
}