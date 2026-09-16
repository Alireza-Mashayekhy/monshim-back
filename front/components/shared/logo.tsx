import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/">
      <Image src="/logo/ZOPPINI.png" width={140} height={33.22} alt="logo" />
    </Link>
  );
}
