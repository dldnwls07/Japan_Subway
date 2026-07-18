import { useCallback, useRef } from "react";

export interface UseComposedInputOptions {
  onSettledChange: (value: string) => void; // 조합이 끝난 안정 상태의 전체 입력값
  onRawKeystroke?: () => void; // CPM 산출용 물리 키 입력 카운트 (5.4절)
}

/**
 * mobile-spec.md §2 그대로: keydown이 아니라 compositionend/input 이벤트로
 * 완성된 음절만 채점한다. 조합 중(예: ㄱ -> 가 -> 각)에는 onSettledChange를 호출하지 않는다.
 */
export function useComposedInput({ onSettledChange, onRawKeystroke }: UseComposedInputOptions) {
  const isComposing = useRef(false);

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposing.current = false;
      onSettledChange(e.currentTarget.value);
    },
    [onSettledChange]
  );

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      if (isComposing.current) return;
      onSettledChange(e.currentTarget.value);
    },
    [onSettledChange]
  );

  const handleKeyDown = useCallback(() => {
    // 정오답 판정에는 쓰지 않고 CPM 분모(자모 단위 타건 수)로만 사용한다.
    onRawKeystroke?.();
  }, [onRawKeystroke]);

  return { handleCompositionStart, handleCompositionEnd, handleInput, handleKeyDown };
}
