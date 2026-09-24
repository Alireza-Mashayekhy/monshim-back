import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/">
      <Image src="/logo/logo.png" width={40} height={40} alt="logo" />
    </Link>
  );
}
