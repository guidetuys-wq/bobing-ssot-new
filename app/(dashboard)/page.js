// app/(dashboard)/page.js

import { redirect } from 'next/navigation';
import { ArrowLeft, RotateCw, ChevronDown } from 'lucide-react';


export default function DashboardGroupRootPage() {
  redirect('/dashboard');
}