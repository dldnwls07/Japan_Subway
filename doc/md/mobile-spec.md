# 모바일/웹 입력 구현 명세 (한글 IME 조합 처리 중심)

> 상위 문서: 개발계획서 5.4절(구현 유의사항 — 한글 조합 입력 처리)의 실제 코드 수준 구현안.
> 대상: `apps/web`, `apps/mobile`

## 1. 문제 정의 (재확인)

`keydown`은 물리 키 입력마다 발생하지만, 한글은 자모가 조합되어 하나의 음절로 완성된다.
`keydown`만으로 채점하면 조합 중간 상태를 오답 처리하거나 동일 음절을 중복 채점한다.
→ **완성된 음절이 확정되는 시점**(웹: `compositionend`/`input`, RN: 텍스트 diff)에만 채점한다.

## 2. 웹(React) 구현

```tsx
// packages/core-engine/src/useComposedInput.ts
import { useRef, useCallback } from "react";

interface UseComposedInputOptions {
  onSettledChange: (value: string) => void; // 조합이 끝난 안정 상태의 전체 입력값
}

export function useComposedInput({ onSettledChange }: UseComposedInputOptions) {
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
      // 조합 중(예: ㄱ -> 가 -> 각 로 바뀌는 중간 단계)에는 채점하지 않는다.
      if (isComposing.current) return;
      // 로마자/숫자처럼 조합이 필요 없는 입력은 input 시점에 바로 확정된다.
      onSettledChange(e.currentTarget.value);
    },
    [onSettledChange]
  );

  return { handleCompositionStart, handleCompositionEnd, handleInput };
}
```

```tsx
// apps/web/src/components/TypingInput.tsx
function TypingInput() {
  const { handleCompositionStart, handleCompositionEnd, handleInput } = useComposedInput({
    onSettledChange: (value) => gameEngine.validateSyllable(value),
  });

  return (
    <input
      ref={hiddenInputRef}
      style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} // 화면엔 커스텀 렌더링을 보여주고 실제 입력은 숨김 input이 담당
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onInput={handleInput}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
    />
  );
}
```

**주의**: `e.nativeEvent.isComposing`을 `keydown` 핸들러에서 같이 확인하면 이중 안전장치가 된다(일부 브라우저는 조합 중 Enter 등 특정 키에서 `compositionend`가 늦게 발생하는 케이스가 있음). 브라우저별(Chrome/Safari/Firefox) 조합 이벤트 타이밍 차이는 실제 물리 키보드 + 한글 IME로 반드시 수동 QA한다(10장 테스트 전략의 E2E 시나리오에 포함).

## 3. React Native(모바일) 구현

RN은 웹의 `compositionstart`/`compositionend`에 대응하는 이벤트를 안정적으로 노출하지 않는다(OS/RN 버전에 따라 동작이 다를 수 있어 신뢰하지 않는다). 따라서 **이전 값과의 diff 기반 접근**을 기본 전략으로 한다.

```tsx
// apps/mobile/src/components/TypingInput.tsx
import { useRef } from "react";
import { TextInput } from "react-native";

function TypingInput({ onSettledChange }: { onSettledChange: (v: string) => void }) {
  const previousValue = useRef("");
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = (text: string) => {
    // 즉시 화면 반영용 로컬 상태 업데이트는 별도로 처리 가능(생략)

    // 한글 자모 조합은 수 밀리초 단위로 연속 갱신되므로,
    // 짧은 디바운스로 "조합이 잠시 멈춘" 시점을 안정 상태로 간주한다.
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (text !== previousValue.current) {
        onSettledChange(text);
        previousValue.current = text;
      }
    }, 16); // 약 1프레임. 필요 시 실기 테스트로 조정
  };

  return (
    <TextInput
      value={undefined} // uncontrolled로 두어 IME 자체 조합 렌더링을 OS에 맡긴다
      onChangeText={handleChangeText}
      autoCorrect={false}
      spellCheck={false}
      autoCapitalize="none"
      keyboardType="default"
      style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
    />
  );
}
```

> 디바운스 시간(16ms)은 출발점일 뿐이다. 실제 저사양 Android 기기에서 타건 시 오탐(조합 중간에 확정 처리)이 발생하면 값을 늘리고, 반응성이 떨어지면 줄인다 — 10장 디바이스 매트릭스 기준 기기로 실측 후 확정한다.

### 3.1 플랫폼별 차이 정리

| 항목 | iOS | Android |
|---|---|---|
| 한글 키보드 조합 처리 | UIKit이 자체 처리, RN에는 확정된 diff만 전달되는 경향 | 제조사 키보드(삼성/구글 Gboard 등)별 타이밍 차이 존재 |
| `autoCorrect`/`spellCheck` | 옵션 존재, 비활성화 필요 | 옵션 존재, 비활성화 필요 |
| 자동 대문자화 | `autoCapitalize="none"` 필요(로마자 모드 대비) | 동일 |
| 백스페이스 연타 시 조합 취소 | 비교적 안정적 | 기기별 편차 큼 — 반드시 실기 QA |

## 4. 로컬 저장소: AsyncStorage vs SQLite

| 기준 | AsyncStorage | expo-sqlite |
|---|---|---|
| 데이터 형태 | 단순 key-value | 관계형(쿼리 필요) |
| 적합한 용도 | 마지막 선택 노선, 언어 모드, 다크모드 설정 | 로컬 플레이 기록 히스토리(정렬/필터 필요 시) |
| 본 프로젝트 권장 | 설정값 저장에 사용 | **14장 백엔드 도입으로 서버가 기록의 원천(source of truth)이 되므로, 1차 출시는 로컬 히스토리 테이블 없이 AsyncStorage만으로 충분.** 오프라인 플레이 지원을 넣을 경우에만 SQLite 도입 |

## 5. 네이티브 모듈이 필요한 경우 (Expo Config Plugin)

2.3절에서 정의한 대로, 원칙적으로 Swift/Kotlin을 직접 작성하지 않는다. 다만 예외적으로 필요해지면:

```json
// app.json (Expo Config Plugin 예시 — 실제 필요 시에만 추가)
{
  "expo": {
    "plugins": [
      ["expo-build-properties", { "ios": { "deploymentTarget": "15.1" }, "android": { "minSdkVersion": 26 } }]
    ]
  }
}
```

현재 9장 기능 범위(SVG/Canvas 렌더링, 로컬 저장, 텍스트 입력)는 모두 기존 Expo/RN 라이브러리로 커버되므로 Config Plugin 이상의 커스텀 네이티브 코드는 필요하지 않을 것으로 예상한다(11장 리스크에 예비 항목으로 기록됨).
