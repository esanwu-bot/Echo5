"use client";

import { useParams, useRouter } from 'next/navigation';
import { ProductDetail } from '../../../components/ProductDetail';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <ProductDetail
      productId={id}
      onNavigate={handleNavigate}
    />
  );
}
