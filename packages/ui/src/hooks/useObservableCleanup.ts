import { useEffect } from 'react';
import { Observable, Subscription } from 'rxjs';

export const useObservableCleanup = <T>(
  observable$: Observable<T> | undefined | null,
  callback: (value: T) => void,
  dependencies: React.DependencyList = []
): void => {
  useEffect(() => {
    if (!observable$) return;
    
    const subscription: Subscription = observable$.subscribe(callback);
    
    return () => {
      subscription.unsubscribe();
    };
  }, [observable$, ...dependencies]);
};