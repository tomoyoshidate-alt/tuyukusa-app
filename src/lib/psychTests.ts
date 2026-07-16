/**
 * 目的別（選択中のAIごと）の初期・心理テストと診断。
 * オンボーディングで「性別・名前 → AI選択 → 心理テスト＋診断 → 目標の設問」の順に使う。
 * つゆくさ医院のしおり（怒り・花粉・血圧・ねむり等）の考え方を、簡易セルフチェックに凝縮したもの。
 * ここでの診断は医療診断ではなく、養生の入口としての「気づき」の提示。
 */

export type PsychChoice = {
  label: string;
  /** 集計タグ。診断はタグの多数決で決まる。 */
  tag: string;
};

export type PsychQuestion = {
  id: string;
  text: string;
  choices: PsychChoice[];
};

export type PsychResult = {
  /** 診断タイプの内部キー */
  typeKey: string;
  /** 見出し（例：「肝の高ぶりタイプ」） */
  title: string;
  /** 本文（やさしい説明＋最初の一歩） */
  body: string;
  /** 続く設問・生活設定への橋渡しの一言 */
  bridge: string;
};

export type PsychTest = {
  moduleId: string;
  /** テスト前の導入メッセージ */
  intro: string;
  questions: PsychQuestion[];
  /** タグ集計から診断を導く */
  diagnose: (tally: Record<string, number>) => PsychResult;
};

function topTag(tally: Record<string, number>, fallback: string): string {
  let best = fallback;
  let bestN = -1;
  for (const [tag, n] of Object.entries(tally)) {
    if (n > bestN) {
      best = tag;
      bestN = n;
    }
  }
  return best;
}

/** 選択画面のAIラベル → moduleId */
export const PSYCH_MODULE_CHOICES: { moduleId: string; label: string }[] = [
  { moduleId: "date-general-v1", label: "🌿 毎日の養生（総合）" },
  { moduleId: "date-adhd-v1", label: "📝 つゆくさADHD（遅刻をなくす）" },
  { moduleId: "date-kafun-v1", label: "🌸 つゆくさ花粉（花粉症を軽く）" },
  { moduleId: "date-anger-v1", label: "🧘 つゆくさアンガー（怒りをしずめる）" },
];

export function moduleIdFromPsychChoice(label: string): string | null {
  const trimmed = label.trim();
  const hit = PSYCH_MODULE_CHOICES.find(c => c.label === trimmed);
  return hit?.moduleId ?? null;
}

const ANGER_TEST: PsychTest = {
  moduleId: "date-anger-v1",
  intro:
    "はじめに、いまの「怒り（イライラ・不安・落ち込みなど負の感情すべて）」のかたちを、かんたんに見てみましょう。3問だけ、直感で選んでください。",
  questions: [
    {
      id: "level",
      text: "この1週間、イライラや怒りをどのくらい感じましたか？",
      choices: [
        { label: "ほとんど感じない（0〜3）", tag: "low" },
        { label: "ときどき感じる（4〜6）", tag: "mid" },
        { label: "よく感じる（7〜10）", tag: "high" },
      ],
    },
    {
      id: "expr",
      text: "怒りを感じたとき、あなたに近いのは？",
      choices: [
        { label: "つい口や態度に出てしまう", tag: "out" },
        { label: "ぐっと内にため込む", tag: "in" },
        { label: "あとで何度も思い返してしまう", tag: "rumination" },
      ],
    },
    {
      id: "trigger",
      text: "怒りの引き金として多いのは？",
      choices: [
        { label: "特定の人・出来事（はっきりした相手）", tag: "mind" },
        { label: "なんとなく、いろいろなことに（対象が曖昧）", tag: "body" },
      ],
    },
  ],
  diagnose: tally => {
    const exprKey = topTag({ out: tally.out ?? 0, in: tally.in ?? 0, rumination: tally.rumination ?? 0 }, "out");
    const bodyLead =
      (tally.body ?? 0) >= (tally.mind ?? 0)
        ? "対象が曖昧なイライラは、こころよりも「からだ（肝の疲れ）」から来ていることが多いタイプ。寝不足・遅い食事・お酒がスイッチになりがちです。まずは塩湯と早寝から整えましょう。"
        : "対象がはっきりした怒りが多いタイプ。背景には「自分は正しい」という思い（べき・ねば）があります。相手ではなく、自分の設定に気づくと、怒りは数分で手放せます。";
    const exprText: Record<string, string> = {
      out: "怒りは外に出やすいタイプ。6秒ルールと丹田呼吸で、最初のひと言を止める練習が効きます。",
      in: "怒りを内にため込むタイプ。ため込みは長引きやすいので、怒り日記に書き出して外に流すのが効きます。",
      rumination: "反芻（何度も思い返す）タイプ。反芻は怒りを長引かせます。気づいたら「これは考えても無駄」と別のことへ気を向けましょう。",
    };
    return {
      typeKey: exprKey,
      title: `あなたの怒りは「${exprKey === "out" ? "外に出る" : exprKey === "in" ? "内にためる" : "反芻する"}」タイプ`,
      body: `${exprText[exprKey]}\n\n${bodyLead}`,
      bridge: "この後、毎日つづける「怒り日記」を一緒に設定します。今日は怒ったか・怒らなかったか、ひとことでOKです。",
    };
  },
};

const KAFUN_TEST: PsychTest = {
  moduleId: "date-kafun-v1",
  intro:
    "花粉症の「証（からだのタイプ）」を、かんたんに見てみましょう。同じ花粉症でも、タイプで養生が変わります。3問、直感でどうぞ。",
  questions: [
    {
      id: "symptom",
      text: "いちばんつらい症状は？",
      choices: [
        { label: "くしゃみ・水のような鼻水", tag: "suitai" },
        { label: "目の充血・かゆみ・のぼせ", tag: "ketsunetsu" },
        { label: "鼻づまり・粘る鼻水", tag: "oketsu" },
      ],
    },
    {
      id: "temp",
      text: "症状は、どんなとき強くなりますか？",
      choices: [
        { label: "冷えたとき・朝・雨の日", tag: "suitai" },
        { label: "温まったとき・入浴後・辛いものの後", tag: "ketsunetsu" },
        { label: "夕方〜夜・肩こりや冷えと一緒に", tag: "oketsu" },
      ],
    },
    {
      id: "body",
      text: "ふだんの体質に近いのは？",
      choices: [
        { label: "むくみやすく、冷え・水分が多い", tag: "suitai" },
        { label: "暑がり・のぼせやすい・肌がかゆい", tag: "ketsunetsu" },
        { label: "冷えのぼせ・くすみ・白砂糖や甘い物が好き", tag: "oketsu" },
      ],
    },
  ],
  diagnose: tally => {
    const key = topTag(
      { suitai: tally.suitai ?? 0, ketsunetsu: tally.ketsunetsu ?? 0, oketsu: tally.oketsu ?? 0 },
      "suitai",
    );
    const map: Record<string, PsychResult> = {
      suitai: {
        typeKey: "suitai",
        title: "水滞（すいたい）タイプ",
        body: "冷えと余分な水が鼻に出るタイプ。就寝前の自然塩（塩湯3g）、暗くなってからの飲食を控える、ふくらはぎを動かす、が効きます。漢方は小青竜湯・五苓散が合いやすい傾向（処方は主治医と）。",
        bridge: "塩湯と早寝を軸に、生活リズムを一緒に設定していきましょう。",
      },
      ketsunetsu: {
        typeKey: "ketsunetsu",
        title: "血熱（けつねつ）タイプ",
        body: "からだにこもった熱が目・のぼせに出るタイプ。白砂糖・アルコール・辛いもの・入浴後の夜更かしを控えめに。キクラゲなどでビタミンDも。漢方は越婢加朮湯・荊芥連翹湯が合いやすい傾向（処方は主治医と）。",
        bridge: "熱を上げない食養生を軸に、生活リズムを一緒に設定していきましょう。",
      },
      oketsu: {
        typeKey: "oketsu",
        title: "瘀血（おけつ）タイプ",
        body: "血のめぐりの滞りが粘る鼻水・慢性化に出るタイプ。白砂糖と冷えを避け、体を動かして巡らせるのが要。漢方は桂枝茯苓丸などが合いやすい傾向（処方は主治医と）。",
        bridge: "巡りを整える食養生と運動を軸に、生活リズムを一緒に設定していきましょう。",
      },
    };
    return map[key];
  },
};

const ADHD_TEST: PsychTest = {
  moduleId: "date-adhd-v1",
  intro:
    "「目標5分前到着」を実現するために、いまの時間の使い方のクセを見てみましょう。3問、正直にどうぞ。責めるためではなく、仕組みで解くためです。",
  questions: [
    {
      id: "arrival",
      text: "約束や予定の時刻に対して、いつものあなたは？",
      choices: [
        { label: "だいたいギリギリ到着", tag: "tight" },
        { label: "遅刻してしまうことが多い", tag: "late" },
        { label: "早めに着くほう", tag: "early" },
      ],
    },
    {
      id: "prep",
      text: "出かける前の準備は？",
      choices: [
        { label: "直前にバタバタ、忘れ物も多い", tag: "late" },
        { label: "なんとか間に合わせる", tag: "tight" },
        { label: "前もって用意できる", tag: "early" },
      ],
    },
    {
      id: "estimate",
      text: "「かかる時間」の見積もりは？",
      choices: [
        { label: "たいてい短く見積もって焦る", tag: "late" },
        { label: "ときどきずれる", tag: "tight" },
        { label: "だいたい合っている", tag: "early" },
      ],
    },
  ],
  diagnose: tally => {
    const key = topTag({ late: tally.late ?? 0, tight: tally.tight ?? 0, early: tally.early ?? 0 }, "tight");
    const map: Record<string, PsychResult> = {
      late: {
        typeKey: "late",
        title: "「時間を短く見積もる」タイプ",
        body: "準備や移動を実際より短く見積もりがちなタイプ。対策はシンプルで、到着時刻から逆算し、各ステップに5〜15分の切り替えバッファを足すこと。出発10分前と直前の2段アラームも効きます。",
        bridge: "この後、あなたの予定に合わせて「5分前到着プラン」を逆算で一緒に組みます。",
      },
      tight: {
        typeKey: "tight",
        title: "「ギリギリ最適化」タイプ",
        body: "間に合わせる力はあるけれど、余白がなく毎回ヒヤヒヤなタイプ。到着5分前を新しいゴールに設定し、前夜に準備を移すだけで、驚くほど楽になります。",
        bridge: "この後、あなたの予定に合わせて「5分前到着プラン」を逆算で一緒に組みます。",
      },
      early: {
        typeKey: "early",
        title: "「余裕をつくれる」タイプ",
        body: "時間に余裕を持てるタイプ。その強みを保ちつつ、疲れている日ほど早め準備が効きます。5分前到着を習慣として固定しましょう。",
        bridge: "この後、あなたの予定に合わせて「5分前到着プラン」を一緒に組みます。",
      },
    };
    return map[key];
  },
};

const GENERAL_TEST: PsychTest = {
  moduleId: "date-general-v1",
  intro:
    "はじめに、いまのからだの状態を「気・血・水」の見立てでかんたんにチェックしましょう。3問、直感でどうぞ。",
  questions: [
    {
      id: "morning",
      text: "朝の目覚めと日中の気力は？",
      choices: [
        { label: "だるい・気力がわかない・疲れやすい", tag: "kikyo" },
        { label: "眠りが浅い・不安・動悸っぽい", tag: "kekkyo" },
        { label: "頭が重い・むくむ・体が冷える", tag: "suitai" },
      ],
    },
    {
      id: "body",
      text: "からだのサインで近いのは？",
      choices: [
        { label: "食後に眠い・声が小さい・風邪をひきやすい", tag: "kikyo" },
        { label: "肌や髪の乾燥・目のかすみ・立ちくらみ", tag: "kekkyo" },
        { label: "むくみ・めまい・雨の日に不調", tag: "suitai" },
      ],
    },
    {
      id: "mind",
      text: "こころの状態で近いのは？",
      choices: [
        { label: "やる気が出ない・億劫", tag: "kikyo" },
        { label: "考えすぎて眠れない・こわい記憶が浮かぶ", tag: "kekkyo" },
        { label: "気分が天気や湿度に左右される", tag: "suitai" },
      ],
    },
  ],
  diagnose: tally => {
    const key = topTag({ kikyo: tally.kikyo ?? 0, kekkyo: tally.kekkyo ?? 0, suitai: tally.suitai ?? 0 }, "kikyo");
    const map: Record<string, PsychResult> = {
      kikyo: {
        typeKey: "kikyo",
        title: "気虚（ききょ）タイプ",
        body: "エネルギー（気）が不足ぎみのタイプ。無理をせず、朝食をしっかり、夜は早めに休むのが要。塩湯で内側から温め、日中の短い休息を取りましょう。",
        bridge: "気を養う生活リズムを、この後の設問で一緒に組み立てます。",
      },
      kekkyo: {
        typeKey: "kekkyo",
        title: "血虚（けっきょ）タイプ",
        body: "血（けつ）が不足ぎみで、乾燥・不眠・不安が出やすいタイプ。夜10〜2時の睡眠を大切に、目の使いすぎを控えめに。温かい食事で滋養を。",
        bridge: "血を補い、眠りを深める生活リズムを、この後の設問で一緒に組み立てます。",
      },
      suitai: {
        typeKey: "suitai",
        title: "水滞（すいたい）タイプ",
        body: "余分な水がたまりやすく、むくみ・重だるさ・天気の影響が出るタイプ。就寝前の塩湯、暗くなってからの飲食を控える、ふくらはぎを動かす、が効きます。",
        bridge: "水はけを整える生活リズムを、この後の設問で一緒に組み立てます。",
      },
    };
    return map[key];
  },
};

const PSYCH_TESTS: Record<string, PsychTest> = {
  "date-general-v1": GENERAL_TEST,
  "date-adhd-v1": ADHD_TEST,
  "date-kafun-v1": KAFUN_TEST,
  "date-anger-v1": ANGER_TEST,
};

export function getPsychTest(moduleId: string | undefined): PsychTest {
  return (moduleId && PSYCH_TESTS[moduleId]) || GENERAL_TEST;
}

/** 回答（question.id → choice.tag）から診断を計算 */
export function diagnosePsych(moduleId: string | undefined, answers: Record<string, string>): PsychResult {
  const test = getPsychTest(moduleId);
  const tally: Record<string, number> = {};
  for (const tag of Object.values(answers)) {
    tally[tag] = (tally[tag] ?? 0) + 1;
  }
  return test.diagnose(tally);
}
