'use client';
import axios from 'axios';

export default function AuthRootRedirect() {
  const onClick = async () => {
    await axios.get('https://monshiim.ir/api/debug-sentry');
    throw new Error('Sentry Test Error');
  };
  return (
    <div>
      <button type="button" onClick={onClick}>
        Break the world
      </button>
    </div>
  );
}
