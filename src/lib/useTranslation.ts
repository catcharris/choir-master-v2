import { useState, useEffect } from 'react';

// Include supported languages
type Language = 'ko' | 'en' | 'it' | 'de' | 'es' | 'ja';

const translations = {
    ko: {
        hero_desc1: '스튜디오급 합창 원격 동기화 플랫폼.',
        hero_desc2: '지휘자와 성가대원을 0.1초 만에 연결합니다.',
        menu_master_title: '지휘자 콘솔',
        menu_master_desc: '오디오 엔진 뷰를 생성하고 수십 명의 성가대원 녹음을 실시간으로 통제합니다.',
        menu_satellite_title: '성가대원 모드',
        menu_satellite_desc: '부여받은 Room 번호로 로그인하여 실시간 합창 녹음에 참여합니다.',
        menu_tuner_title: '개인 피치 튜너',
        menu_tuner_desc: '서버 연결 없이 스마트 디바이스로 내 발성의 음정을 독립적으로 교정합니다.'
    },
    en: {
        hero_desc1: 'Studio-grade choir remote synchronization.',
        hero_desc2: 'Connecting conductors and singers in 0.1 seconds.',
        menu_master_title: 'Conductor Console',
        menu_master_desc: 'Create an audio engine view and control real-time recordings of dozens of choir members.',
        menu_satellite_title: 'Choir Member Mode',
        menu_satellite_desc: 'Log in with a Room ID to participate in real-time synchronized choir recording.',
        menu_tuner_title: 'Personal Pitch Tuner',
        menu_tuner_desc: 'Correct your vocal pitch independently on your device without server connection.'
    },
    it: {
        hero_desc1: 'Sincronizzazione remota del coro di livello studio.',
        hero_desc2: 'Collega direttori e cantori in 0,1 secondi.',
        menu_master_title: 'Console del Direttore',
        menu_master_desc: 'Crea una vista del motore audio e controlla in tempo reale le registrazioni di decine di coristi.',
        menu_satellite_title: 'Modalità Cantore',
        menu_satellite_desc: 'Accedi con un ID Stanza per partecipare alla registrazione sincronizzata in tempo reale.',
        menu_tuner_title: 'Accordatore di Tonalità Personale',
        menu_tuner_desc: 'Correggi la tua tonalità vocale in modo indipendente sul tuo dispositivo senza connessione al server.'
    },
    de: {
        hero_desc1: 'Chor-Fernsynchronisation auf Studioniveau.',
        hero_desc2: 'Verbindet Dirigenten und Sänger in 0,1 Sekunden.',
        menu_master_title: 'Dirigentenkonsole',
        menu_master_desc: 'Erstellen Sie eine Audio-Engine-Ansicht und steuern Sie Echtzeitaufnahmen von Dutzenden von Chormitgliedern.',
        menu_satellite_title: 'Chormitglied-Modus',
        menu_satellite_desc: 'Melden Sie sich mit einer Raum-ID an, um an der synchronisierten Echtzeit-Choraufnahme teilzunehmen.',
        menu_tuner_title: 'Persönlicher Pitch-Tuner',
        menu_tuner_desc: 'Korrigieren Sie Ihre Stimmlage unabhängig auf Ihrem Gerät ohne Serververbindung.'
    },
    es: {
        hero_desc1: 'Sincronización remota de coros a nivel de estudio.',
        hero_desc2: 'Conectando a directores y cantantes en 0.1 segundos.',
        menu_master_title: 'Consola del Director',
        menu_master_desc: 'Cree una vista del motor de audio y controle en tiempo real las grabaciones de docenas de miembros del coro.',
        menu_satellite_title: 'Modo Miembro del Coro',
        menu_satellite_desc: 'Inicie sesión con un ID de sala para participar en la grabación de coro sincronizada en tiempo real.',
        menu_tuner_title: 'Afinador de Tono Personal',
        menu_tuner_desc: 'Corrija su tono vocal de forma independiente en su dispositivo sin conexión al servidor.'
    },
    ja: {
        hero_desc1: 'スタジオ品質の合唱リモート同期プラットフォーム。',
        hero_desc2: '指揮者と聖歌隊員を0.1秒で繋ぎます。',
        menu_master_title: '指揮者コンソール',
        menu_master_desc: 'オーディオエンジンビューを作成し、数十人の聖歌隊員の録音をリアルタイムで制御します。',
        menu_satellite_title: '聖歌隊員モード',
        menu_satellite_desc: '付与されたルームIDでログインし、リアルタイムの合唱録音に参加します。',
        menu_tuner_title: '個人用ピッチチューナー',
        menu_tuner_desc: 'サーバー接続なしで、デバイス単独で自分の発声ピッチを正確に補正します。'
    }
};

export function useTranslation() {
    const [lang, setLang] = useState<Language>('ko'); // Default fallback for SSR

    useEffect(() => {
        if (typeof window !== 'undefined' && navigator.language) {
            // get first two characters (e.g., "ko-KR" -> "ko", "en-US" -> "en")
            const browserLang = navigator.language.substring(0, 2).toLowerCase();

            const supportedLanguages: Language[] = ['ko', 'en', 'it', 'de', 'es', 'ja'];

            if (supportedLanguages.includes(browserLang as Language)) {
                setLang(browserLang as Language);
            } else {
                // Fallback to English if the user's language is not supported
                setLang('en');
            }
        }
    }, []);

    return translations[lang];
}
