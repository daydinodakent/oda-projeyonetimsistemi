import React from 'react';
import { useStore } from '../../store/useStore.js';

export default function Toast() {
  const toast = useStore((s) => s.toast);
  return <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>;
}
