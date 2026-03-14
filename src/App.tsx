import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TreePine, 
  Bird, 
  Waves, 
  Info, 
  ChevronRight, 
  Mic2, 
  Camera,
  Heart,
  Wind,
  Volume2,
  Activity,
  Play,
  Pause,
  Search,
  ShieldAlert,
  Headphones,
  X
} from 'lucide-react';
import { pcmToWav } from './utils/audio';
import { getWildlifeInfo, WildlifeInfo, getPantanalOverview, analyzeAcousticClip, AcousticAnalysis, generateSpeech, generateSoundscapeDescription } from './services/gemini';

const AMBIENT_SOUNDS = [
  { id: 'birds', name: 'Morning Birds', url: 'https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg' },
  { id: 'rain', name: 'Tropical Rain', url: 'https://actions.google.com/sounds/v1/ambiences/rain_on_roof.ogg' },
  { id: 'wind', name: 'Marsh Wind', url: 'https://actions.google.com/sounds/v1/ambiences/wind_howling.ogg' },
  { id: 'night', name: 'Night Insects', url: 'https://actions.google.com/sounds/v1/ambiences/crickets_chirping.ogg' },
];

const CLIPS = [
  { id: 'morning-chorus', name: 'Morning Chorus', location: 'Northern Pantanal', duration: '0:45', type: 'Ambient', url: 'https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg' },
  { id: 'river-bank', name: 'River Bank Night', location: 'Cuiabá River', duration: '1:12', type: 'Species Specific', url: 'https://actions.google.com/sounds/v1/water/river_flowing.ogg' },
  { id: 'marsh-vocal', name: 'Marsh Vocalizations', location: 'Transpantaneira', duration: '0:30', type: 'Research', url: 'https://actions.google.com/sounds/v1/ambiences/crickets_chirping.ogg' },
];

const SPECIES = [
  { id: 'jaguar', name: 'Jaguar', icon: '🐆', image: 'https://images.unsplash.com/photo-1574068468668-a05a11f871da?auto=format&fit=crop&q=80&w=1000' },
  { id: 'caiman', name: 'Yacare Caiman', icon: '🐊', image: 'https://images.unsplash.com/photo-1549240923-93a2e080e653?auto=format&fit=crop&q=80&w=1000' },
  { id: 'capybara', name: 'Capybara', icon: '🦦', image: 'https://images.unsplash.com/photo-1620230992283-48220af05fa8?auto=format&fit=crop&q=80&w=1000' },
  { id: 'hyacinth-macaw', name: 'Hyacinth Macaw', icon: '🦜', image: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?auto=format&fit=crop&q=80&w=1000' },
  { id: 'giant-otter', name: 'Giant Otter', icon: '🦦', image: 'https://images.unsplash.com/photo-1598974357851-cb05bf3714a1?auto=format&fit=crop&q=80&w=1000' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'acoustics' | 'wildlife' | 'generator'>('home');
  const [isZenMode, setIsZenMode] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [wildlifeData, setWildlifeData] = useState<WildlifeInfo | null>(null);
  const [overview, setOverview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Acoustic State
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AcousticAnalysis | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [clipTime, setClipTime] = useState({ current: 0, duration: 0 });

  // Narration State
  const [isNarrating, setIsNarrating] = useState(false);
  const [isGalleryPlaying, setIsGalleryPlaying] = useState(false);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(-1);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [isNarratorEnabled, setIsNarratorEnabled] = useState(false);
  const [activeAmbient, setActiveAmbient] = useState<string>('birds');
  const [volume, setVolume] = useState(0.3);
  const [generatorState, setGeneratorState] = useState({
    place: 'Pantanal Wetlands',
    time: 'morning',
    elements: ['birds', 'water', 'frogs', 'insects', 'wind'],
    atmosphere: 'peaceful',
    isGenerating: false,
    result: ''
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const clipAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const text = await getPantanalOverview();
        setOverview(text || '');
      } catch (error) {
        console.error("Failed to fetch overview:", error);
        setOverview("Welcome to the Pantanal Soundscape Explorer. We are currently experiencing issues connecting to our ecological database, but you can still explore the acoustic environment.");
      }
    };
    fetchOverview();

    // Initialize ambient audio
    const initialAmbient = AMBIENT_SOUNDS.find(s => s.id === activeAmbient);
    if (initialAmbient?.url) {
      ambientRef.current = new Audio(initialAmbient.url);
      ambientRef.current.loop = true;
      ambientRef.current.volume = volume;
      ambientRef.current.onerror = (e) => {
        console.error("Ambient audio error:", e);
        setIsAmbientPlaying(false);
      };
    }

    return () => {
      ambientRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
      clipAudioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (ambientRef.current) {
      ambientRef.current.volume = volume;
    }
    if (clipAudioRef.current) {
      clipAudioRef.current.volume = volume;
    }
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const changeAmbient = (id: string) => {
    const sound = AMBIENT_SOUNDS.find(s => s.id === id);
    if (!sound) return;

    const wasPlaying = isAmbientPlaying;
    if (ambientRef.current) {
      ambientRef.current.pause();
    }
    
    ambientRef.current = new Audio(sound.url);
    ambientRef.current.loop = true;
    ambientRef.current.volume = volume;
    ambientRef.current.onerror = (e) => {
      console.error("Ambient audio change error:", e);
      setIsAmbientPlaying(false);
    };
    setActiveAmbient(id);
    
    if (wasPlaying) {
      ambientRef.current.play().catch(err => {
        console.error("Ambient playback failed:", err);
        setIsAmbientPlaying(false);
      });
    }
  };

  const toggleAmbient = () => {
    if (isAmbientPlaying) {
      ambientRef.current?.pause();
      setIsAmbientPlaying(false);
    } else {
      ambientRef.current?.play().then(() => {
        setIsAmbientPlaying(true);
      }).catch(err => {
        console.error("Ambient playback failed:", err);
        setIsAmbientPlaying(false);
      });
    }
  };

  const handleSpeciesSelect = async (speciesId: string) => {
    setSelectedSpecies(speciesId);
    setLoading(true);
    try {
      const data = await getWildlifeInfo(speciesId);
      setWildlifeData(data);
      if (isNarratorEnabled) {
        handleNarrate(data.description, `Profile of the ${data.name}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeClip = async (clipId: string) => {
    const clip = CLIPS.find(c => c.id === clipId);
    if (!clip) return;

    setSelectedClip(clipId);
    setAnalyzing(true);
    setAnalysisProgress(0);
    setIsPlaying(true);

    // Simulate analysis progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 400);

    // Play clip audio
    if (clipAudioRef.current) {
      clipAudioRef.current.pause();
    }
    clipAudioRef.current = new Audio(clip.url);
    clipAudioRef.current.volume = volume;
    clipAudioRef.current.onerror = (e) => {
      console.error("Clip audio error:", e);
      setIsPlaying(false);
    };
    clipAudioRef.current.ontimeupdate = () => {
      if (clipAudioRef.current) {
        setClipTime({
          current: clipAudioRef.current.currentTime,
          duration: clipAudioRef.current.duration || 0
        });
      }
    };
    clipAudioRef.current.play().catch(err => {
      console.error("Clip playback failed:", err);
      setIsPlaying(false);
    });
    clipAudioRef.current.onended = () => setIsPlaying(false);

    try {
      const result = await analyzeAcousticClip(clipId);
      setAnalysis(result);
      if (isNarratorEnabled) {
        handleNarrate(`${result.environmentalContext}. ${result.conservationImpact}`, "Acoustic Analysis Result");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAnalyzing(false);
      setAnalysisProgress(100);
      clearInterval(progressInterval);
    }
  };

  const handleSeek = (time: number) => {
    if (clipAudioRef.current) {
      clipAudioRef.current.currentTime = time;
      setClipTime(prev => ({ ...prev, current: time }));
    }
  };

  const toggleClipPlayback = () => {
    if (isPlaying) {
      clipAudioRef.current?.pause();
      setIsPlaying(false);
    } else {
      clipAudioRef.current?.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Clip playback failed:", err);
        setIsPlaying(false);
      });
    }
  };

  const handleNarrate = async (text: string, prefix: string = "", onEnded?: () => void) => {
    if (isNarrating) {
      audioRef.current?.pause();
      setIsNarrating(false);
      return;
    }

    setIsNarrating(true);
    setErrorMsg(null);
    try {
      const fullText = prefix ? `${prefix}: ${text}` : text;
      const base64Audio = await generateSpeech(fullText);
      const audioUrl = pcmToWav(base64Audio);
      
      if (audioRef.current) {
        // Revoke old URL if it exists to prevent memory leaks
        if (audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.pause();
        audioRef.current.src = audioUrl;
      } else {
        audioRef.current = new Audio(audioUrl);
      }
      
      audioRef.current.volume = volume;
      audioRef.current.onerror = (e) => {
        console.error("Narration audio error:", e);
        setIsNarrating(false);
      };
      audioRef.current.play().catch(err => {
        console.error("Playback failed:", err);
        setIsNarrating(false);
      });
      audioRef.current.onended = () => {
        setIsNarrating(false);
        if (onEnded) onEnded();
      };
    } catch (error: any) {
      console.error("Narration failed:", error);
      setIsNarrating(false);
      setErrorMsg(error.message || "Narration failed. Please try again.");
      // Clear error after 5 seconds
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleGenerateSoundscape = async () => {
    setGeneratorState(prev => ({ ...prev, isGenerating: true, result: '' }));
    try {
      const description = await generateSoundscapeDescription({
        place: generatorState.place,
        time: generatorState.time,
        elements: generatorState.elements,
        atmosphere: generatorState.atmosphere
      });
      setGeneratorState(prev => ({ ...prev, result: description }));
      
      // Automatically narrate the generated soundscape
      handleNarrate(description, `Immersive soundscape of ${generatorState.place}`);
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setGeneratorState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const playVoiceGallery = async (index: number = 0) => {
    if (index >= SPECIES.length) {
      setIsGalleryPlaying(false);
      setCurrentGalleryIndex(-1);
      return;
    }

    setIsGalleryPlaying(true);
    setCurrentGalleryIndex(index);
    const species = SPECIES[index];
    
    try {
      setLoading(true);
      const data = await getWildlifeInfo(species.id);
      setWildlifeData(data);
      setLoading(false);
      
      handleNarrate(
        data.vocalizationDescription, 
        `The vocalization profile of the ${data.name}`,
        () => playVoiceGallery(index + 1)
      );
    } catch (error) {
      console.error("Gallery playback failed:", error);
      setIsGalleryPlaying(false);
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-[#d4fc79]/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 z-[-1] overflow-hidden">
        <div className="absolute inset-0 bg-[#0a0c08]" />
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#1a2e1a] blur-[120px] opacity-40 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#2d3a1a] blur-[100px] opacity-30" />
      </div>

      {/* Error Toast */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-red-500/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <p className="text-sm font-medium">{errorMsg}</p>
              <button 
                onClick={() => setErrorMsg(null)}
                className="ml-auto hover:bg-white/10 p-1 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Volume2 className="text-[#d4fc79] w-6 h-6" />
          <span className="font-display text-2xl font-semibold tracking-tight">Pantanal Soundscape</span>
        </div>
        <div className="flex gap-8 items-center glass rounded-full px-6 py-2">
          {[
            { id: 'home', label: 'Listen', icon: Wind },
            { id: 'acoustics', label: 'Monitor', icon: Activity },
            { id: 'wildlife', label: 'Species', icon: Bird },
            { id: 'generator', label: 'Generator', icon: Mic2 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === item.id ? 'text-[#d4fc79]' : 'text-white/60 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => setIsNarratorEnabled(!isNarratorEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isNarratorEnabled ? 'bg-[#d4fc79] border-[#d4fc79] text-[#0a0c08]' : 'border-white/10 text-white/40 hover:border-white/20'}`}
          >
            <Mic2 className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-bold">{isNarratorEnabled ? 'Narrator On' : 'Narrator Off'}</span>
          </button>
          <button 
            onClick={() => setIsZenMode(!isZenMode)}
            className={`p-2 rounded-full glass border-white/5 transition-all ${isZenMode ? 'text-[#d4fc79] bg-[#d4fc79]/10' : 'text-white/40 hover:text-white'}`}
            title="Zen Mode"
          >
            <Wind className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 glass px-4 py-2 rounded-full border-white/5">
            <Volume2 className="w-4 h-4 text-white/40" />
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume} 
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#d4fc79]"
            />
            <span className="text-[10px] font-bold text-[#d4fc79] w-8">{Math.round(volume * 100)}%</span>
          </div>
          <button 
            onClick={toggleAmbient}
            className={`flex items-center gap-2 glass px-4 py-1.5 rounded-full border-white/5 transition-all ${isAmbientPlaying ? 'bg-[#d4fc79]/10 border-[#d4fc79]/30' : ''}`}
          >
            <div className={`w-2 h-2 rounded-full ${isAmbientPlaying ? 'bg-[#d4fc79] animate-pulse' : 'bg-white/20'}`} />
            <span className={`text-[10px] uppercase tracking-widest font-bold ${isAmbientPlaying ? 'text-[#d4fc79]' : 'text-white/40'}`}>
              {isAmbientPlaying ? 'Ambient: Active' : 'Ambient: Muted'}
            </span>
          </button>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {isZenMode ? (
            <motion.div
              key="zen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] space-y-12"
            >
              <div className="relative w-full max-w-2xl aspect-video rounded-[40px] overflow-hidden glass border-white/5 flex items-center justify-center">
                <div className="flex items-center justify-center gap-2">
                  {[...Array(24)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: isAmbientPlaying || isPlaying || isNarrating ? [20, 150, 40, 120, 20] : 20,
                        opacity: isAmbientPlaying || isPlaying || isNarrating ? [0.2, 0.8, 0.2] : 0.2
                      }}
                      transition={{ 
                        duration: 1 + Math.random(), 
                        repeat: Infinity,
                        delay: i * 0.05
                      }}
                      className="w-2 bg-[#d4fc79] rounded-full"
                    />
                  ))}
                </div>
              </div>
              <div className="w-full max-w-2xl glass rounded-[32px] p-8 border-white/5 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-display font-bold italic">Soundscape Mixer</h3>
                  <button 
                    onClick={() => setIsZenMode(false)}
                    className="text-[10px] uppercase tracking-widest font-bold text-white/40 hover:text-[#d4fc79]"
                  >
                    Exit Zen Mode
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {AMBIENT_SOUNDS.map((sound) => (
                    <button
                      key={sound.id}
                      onClick={() => changeAmbient(sound.id)}
                      className={`p-4 rounded-2xl border transition-all text-center space-y-2 ${
                        activeAmbient === sound.id 
                          ? 'bg-[#d4fc79]/10 border-[#d4fc79] text-[#d4fc79]' 
                          : 'glass border-white/5 text-white/40 hover:border-white/20'
                      }`}
                    >
                      <Wind className="w-5 h-5 mx-auto opacity-50" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">{sound.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid lg:grid-cols-2 gap-16 items-center"
            >
              <div className="space-y-12">
                <div className="space-y-8">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 text-[#d4fc79]"
                  >
                    <ShieldAlert className="w-5 h-5" />
                    <span className="text-xs uppercase tracking-[0.2em] font-bold">Conservation Alert: Wildfire Risk High</span>
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="font-display text-7xl md:text-8xl lg:text-9xl leading-[0.85] font-bold tracking-tighter"
                  >
                    HEAR THE <br />
                    <span className="text-gradient italic">UNSEEN.</span>
                  </motion.h1>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="max-w-md space-y-6"
                  >
                    <div className="relative group">
                      <p className="text-lg text-white/70 font-serif leading-relaxed italic">
                        Traditional surveys cannot scale to the 150,000 km² of the Pantanal. We use bioacoustics to identify understudied species from their vocalizations, turning sound into tools for biodiversity monitoring.
                      </p>
                      <button 
                        onClick={() => handleNarrate("Traditional surveys cannot scale to the 150,000 km² of the Pantanal. We use bioacoustics to identify understudied species from their vocalizations, turning sound into tools for biodiversity monitoring.")}
                        className="absolute -right-12 top-0 p-2 text-[#d4fc79] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                      <div className="flex flex-wrap gap-4">
                        <button 
                          onClick={() => setActiveTab('acoustics')}
                          className="group flex items-center gap-4 bg-[#d4fc79] text-[#0a0c08] px-8 py-4 rounded-full font-bold transition-transform hover:scale-105"
                        >
                          Analyze Audio
                          <Activity className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('generator');
                            setGeneratorState({
                              place: 'Pantanal Wetland Habitat',
                              time: 'afternoon',
                              elements: ['jungle birds', 'frogs', 'insects', 'gentle water movement', 'distant jaguar calls'],
                              atmosphere: 'immersive',
                              isGenerating: false,
                              result: ''
                            });
                            // Small delay to ensure tab switch before generation
                            setTimeout(handleGenerateSoundscape, 100);
                          }}
                          className="glass px-8 py-4 rounded-full font-bold text-[#d4fc79] hover:bg-[#d4fc79]/10 transition-colors flex items-center gap-2 border border-[#d4fc79]/30"
                        >
                          <Play className="w-5 h-5" />
                          Immersive Soundscape
                        </button>
                        <button 
                          onClick={() => {
                          const randomClip = CLIPS[Math.floor(Math.random() * CLIPS.length)];
                          if (clipAudioRef.current) clipAudioRef.current.pause();
                          clipAudioRef.current = new Audio(randomClip.url);
                          clipAudioRef.current.volume = volume;
                          clipAudioRef.current.play().catch(err => {
                            console.error("Quick Listen playback failed:", err);
                            setIsPlaying(false);
                          });
                          setIsPlaying(true);
                          setActiveTab('acoustics');
                          setSelectedClip(randomClip.id);
                        }}
                        className="glass px-8 py-4 rounded-full font-bold text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2"
                      >
                        <Volume2 className="w-4 h-4" />
                        Quick Listen
                      </button>
                    </div>
                  </motion.div>
                </div>

                {/* Soundscape Mixer & Featured */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6"
                >
                  <div className="glass rounded-[32px] p-8 border-white/5 space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-display font-bold italic">Mixer</h3>
                      <button 
                        onClick={async () => {
                          const sound = AMBIENT_SOUNDS.find(s => s.id === activeAmbient);
                          if (sound) {
                            handleNarrate(`You are listening to ${sound.name}. This soundscape represents a vital part of the Pantanal ecosystem.`, "Ecosystem Insight");
                          }
                        }}
                        className="text-[10px] uppercase tracking-widest font-bold text-[#d4fc79] hover:underline"
                      >
                        Info
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {AMBIENT_SOUNDS.map((sound) => (
                        <button
                          key={sound.id}
                          onClick={() => changeAmbient(sound.id)}
                          className={`p-3 rounded-2xl border transition-all text-center space-y-1 ${
                            activeAmbient === sound.id 
                              ? 'bg-[#d4fc79]/10 border-[#d4fc79] text-[#d4fc79]' 
                              : 'glass border-white/5 text-white/40 hover:border-white/20'
                          }`}
                        >
                          <Wind className="w-4 h-4 mx-auto opacity-50" />
                          <p className="text-[8px] font-bold uppercase tracking-widest">{sound.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="glass rounded-[32px] p-8 border-[#d4fc79]/20 bg-[#d4fc79]/5 space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                      <div className="bg-[#d4fc79] text-[#0a0c08] text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">Featured</div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-display font-bold italic">Sunrise</h3>
                      <p className="text-white/40 text-xs leading-relaxed">The awakening of the wetlands.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Water', 'Birds'].map(tag => (
                        <span key={tag} className="text-[8px] uppercase tracking-widest bg-white/5 px-2 py-1 rounded-full text-white/40">{tag}</span>
                      ))}
                    </div>
                    <button 
                      onClick={() => {
                        setGeneratorState({
                          place: 'Pantanal Wetlands, Brazil',
                          time: 'morning',
                          elements: ['gentle water movement', 'distant bird calls', 'frogs croaking', 'insects buzzing', 'soft wind', 'splashes'],
                          atmosphere: 'peaceful',
                          isGenerating: false,
                          result: ''
                        });
                        setActiveTab('generator');
                      }}
                      className="w-full py-3 bg-[#d4fc79] text-[#0a0c08] rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(212,252,121,0.2)] transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Listen
                    </button>
                  </div>

                  <div className="glass rounded-[32px] p-8 border-indigo-500/20 bg-indigo-500/5 space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                      <div className="bg-indigo-500 text-white text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">Featured</div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-display font-bold italic">Night</h3>
                      <p className="text-white/40 text-xs leading-relaxed">The mysterious nocturnal chorus.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Frogs', 'Owls', 'Insects'].map(tag => (
                        <span key={tag} className="text-[8px] uppercase tracking-widest bg-white/5 px-2 py-1 rounded-full text-white/40">{tag}</span>
                      ))}
                    </div>
                    <button 
                      onClick={() => {
                        setGeneratorState({
                          place: 'Pantanal Wetlands, Brazil',
                          time: 'night',
                          elements: ['loud frog choruses', 'crickets', 'distant owl calls', 'water ripples', 'animal movements in reeds'],
                          atmosphere: 'wild',
                          isGenerating: false,
                          result: ''
                        });
                        setActiveTab('generator');
                      }}
                      className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Listen
                    </button>
                  </div>

                  <div className="glass rounded-[32px] p-8 border-emerald-500/20 bg-emerald-500/5 space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                      <div className="bg-emerald-500 text-white text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">Featured</div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-display font-bold italic">Documentary</h3>
                      <p className="text-white/40 text-xs leading-relaxed">Cinematic ecosystem narrative.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Vast', 'Thunder', 'Biodiverse'].map(tag => (
                        <span key={tag} className="text-[8px] uppercase tracking-widest bg-white/5 px-2 py-1 rounded-full text-white/40">{tag}</span>
                      ))}
                    </div>
                    <button 
                      onClick={() => {
                        setGeneratorState({
                          place: 'Pantanal Wetlands, Brazil',
                          time: 'afternoon',
                          elements: ['tropical birds', 'frogs', 'insects', 'flowing water', 'wind through reeds', 'distant thunder'],
                          atmosphere: 'immersive',
                          isGenerating: false,
                          result: ''
                        });
                        setActiveTab('generator');
                      }}
                      className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Listen
                    </button>
                  </div>

                  <div className="glass rounded-[32px] p-8 border-orange-500/20 bg-orange-500/5 space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                      <div className="bg-orange-500 text-white text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">Featured</div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-display font-bold italic">Jaguar</h3>
                      <p className="text-white/40 text-xs leading-relaxed">Apex predator territory.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Jaguar', 'Birds', 'Wetland'].map(tag => (
                        <span key={tag} className="text-[8px] uppercase tracking-widest bg-white/5 px-2 py-1 rounded-full text-white/40">{tag}</span>
                      ))}
                    </div>
                    <button 
                      onClick={() => {
                        setGeneratorState({
                          place: 'Pantanal Wetland Habitat',
                          time: 'afternoon',
                          elements: ['jungle birds', 'frogs', 'insects', 'gentle water movement', 'distant jaguar calls'],
                          atmosphere: 'immersive',
                          isGenerating: false,
                          result: ''
                        });
                        setActiveTab('generator');
                      }}
                      className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Listen
                    </button>
                  </div>
                </motion.div>
              </div>
              <div className="relative aspect-square rounded-[40px] overflow-hidden group">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          height: [20, 100, 40, 80, 20],
                          opacity: [0.2, 0.5, 0.2]
                        }}
                        transition={{ 
                          duration: 1.5 + Math.random(), 
                          repeat: Infinity,
                          delay: i * 0.1
                        }}
                        className="w-2 mx-1 bg-[#d4fc79] rounded-full"
                      />
                    ))}
                  </div>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&q=80&w=1000" 
                  alt="Pantanal Landscape"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c08] via-transparent to-transparent opacity-60" />
              </div>
            </motion.div>
          )}

          {activeTab === 'acoustics' && (
            <motion.div
              key="acoustics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-1 space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-4xl font-bold italic">Audio Library</h2>
                  <p className="text-white/40 text-sm">Select a recording from our remote monitoring stations.</p>
                </div>
                <div className="space-y-4">
                  {CLIPS.map((clip) => (
                    <button
                      key={clip.id}
                      onClick={() => handleAnalyzeClip(clip.id)}
                      className={`w-full text-left p-6 rounded-3xl border transition-all ${
                        selectedClip === clip.id 
                          ? 'bg-[#d4fc79]/10 border-[#d4fc79] shadow-[0_0_20px_rgba(212,252,121,0.1)]' 
                          : 'glass border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/5 rounded-lg">
                          <Mic2 className={`w-5 h-5 ${selectedClip === clip.id ? 'text-[#d4fc79]' : 'text-white/40'}`} />
                        </div>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{clip.duration}</span>
                      </div>
                      <h4 className="font-bold text-lg mb-1">{clip.name}</h4>
                      <p className="text-xs text-white/40 mb-4">{clip.location}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/10 uppercase font-bold tracking-tighter">
                          {clip.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                <div className="glass rounded-[40px] p-12 min-h-[500px] flex flex-col relative overflow-hidden">
                  {/* Waveform Visualization */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 cursor-pointer group/seek"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = x / rect.width;
                      handleSeek(percentage * clipTime.duration);
                    }}
                  >
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: clipTime.duration ? `${(clipTime.current / clipTime.duration) * 100}%` : '0%' }}
                      className="h-full bg-[#d4fc79] relative"
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#d4fc79] rounded-full shadow-[0_0_10px_#d4fc79] opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                    </motion.div>
                  </div>

                  {!selectedClip ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                      <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white/20" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-display font-bold">Ready for Analysis</h3>
                        <p className="text-white/40 max-w-xs mx-auto">Select a clip to begin the bioacoustic identification process.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col space-y-12">
                        <div className="flex justify-between items-center">
                        <div className="flex items-center gap-6">
                          <button 
                            onClick={toggleClipPlayback}
                            className="w-16 h-16 rounded-full bg-[#d4fc79] text-[#0a0c08] flex items-center justify-center hover:scale-105 transition-transform"
                          >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                          </button>
                          <div>
                            <h3 className="text-3xl font-display font-bold">{CLIPS.find(c => c.id === selectedClip)?.name}</h3>
                            <div className="flex items-center gap-3">
                              <p className="text-[#d4fc79] text-sm font-bold uppercase tracking-widest">
                                {analyzing ? `Analyzing: ${Math.round(analysisProgress)}%` : 'Analysis Complete'}
                              </p>
                              {analyzing && (
                                <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${analysisProgress}%` }}
                                    className="h-full bg-[#d4fc79]"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {[...Array(5)].map((_, i) => (
                            <motion.div 
                              key={i}
                              animate={{ height: isPlaying ? [10, 30, 15, 40, 10] : 10 }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                              className="w-1 bg-[#d4fc79]/40 rounded-full"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-12">
                        <div className="space-y-8">
                          <div className="space-y-4">
                            <h4 className="text-xs uppercase tracking-widest font-bold text-white/40 flex items-center gap-2">
                              <Search className="w-3 h-3" /> Species Identified
                            </h4>
                            <div className="space-y-3">
                              {analyzing ? (
                                <div className="h-20 bg-white/5 animate-pulse rounded-2xl" />
                              ) : analysis?.speciesIdentified.map((s, i) => (
                                <motion.div 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  key={s.name} 
                                  className="p-4 glass rounded-2xl border-white/5 flex justify-between items-center"
                                >
                                  <div>
                                    <p className="font-bold text-[#d4fc79]">{s.name}</p>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{s.vocalizationType}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-display font-bold">{(s.confidence * 100).toFixed(0)}%</p>
                                    <p className="text-[8px] text-white/30 uppercase tracking-tighter">Confidence</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-xs uppercase tracking-widest font-bold text-white/40">Overall Confidence</h4>
                            <div className="flex items-end gap-4">
                              <span className="text-6xl font-display font-bold text-gradient">
                                {analyzing ? '--' : `${Math.round((analysis?.overallConfidence || 0) * 100)}%`}
                              </span>
                              <p className="text-xs text-white/30 mb-2 max-w-[100px]">Aggregated model certainty across all detected signals.</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs uppercase tracking-widest font-bold text-white/40">Environmental Context</h4>
                              {!analyzing && analysis && (
                                <button 
                                  onClick={() => handleNarrate(analysis.environmentalContext)}
                                  className="text-[#d4fc79] hover:scale-110 transition-transform"
                                >
                                  <Volume2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-white/70 font-serif leading-relaxed italic">
                              {analyzing ? "Analyzing background noise..." : analysis?.environmentalContext}
                            </p>
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs uppercase tracking-widest font-bold text-white/40">Technical Analysis</h4>
                              {!analyzing && analysis && (
                                <button 
                                  onClick={() => handleNarrate(analysis.detailedAnalysis)}
                                  className="text-[#d4fc79] hover:scale-110 transition-transform"
                                >
                                  <Volume2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                              {analyzing ? "Synthesizing spectral features..." : analysis?.detailedAnalysis}
                            </p>
                          </div>
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-xs uppercase tracking-widest font-bold text-[#d4fc79] flex items-center gap-2">
                                <Heart className="w-3 h-3" /> Conservation Impact
                              </h4>
                              {!analyzing && analysis && (
                                <button 
                                  onClick={() => handleNarrate(analysis.conservationImpact)}
                                  className="text-[#d4fc79] hover:scale-110 transition-transform"
                                >
                                  <Volume2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                              {analyzing ? "Calculating biodiversity metrics..." : analysis?.conservationImpact}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

            {/* Generator Tab */}
            {activeTab === 'generator' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12"
              >
                <div className="flex flex-col md:flex-row justify-between items-end gap-8">
                  <div className="space-y-4">
                    <h2 className="font-display text-5xl font-bold italic">Soundscape Generator</h2>
                    <p className="text-white/50 max-w-md">Craft your own immersive auditory experience using AI.</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => {
                        setGeneratorState({
                          place: 'Pantanal Wetlands, Brazil',
                          time: 'morning',
                          elements: ['gentle water movement', 'distant bird calls', 'frogs croaking', 'insects buzzing', 'soft wind', 'splashes'],
                          atmosphere: 'peaceful',
                          isGenerating: false,
                          result: ''
                        });
                      }}
                      className="glass px-6 py-3 rounded-full text-xs font-bold text-[#d4fc79] border-[#d4fc79]/30 hover:bg-[#d4fc79]/10 transition-all"
                    >
                      Preset: Sunrise
                    </button>
                    <button 
                      onClick={() => {
                        setGeneratorState({
                          place: 'Pantanal Wetlands, Brazil',
                          time: 'night',
                          elements: ['loud frog choruses', 'crickets', 'distant owl calls', 'water ripples', 'animal movements in reeds'],
                          atmosphere: 'wild',
                          isGenerating: false,
                          result: ''
                        });
                      }}
                      className="glass px-6 py-3 rounded-full text-xs font-bold text-[#d4fc79] border-[#d4fc79]/30 hover:bg-[#d4fc79]/10 transition-all"
                    >
                      Preset: Night
                    </button>
                    <button 
                      onClick={() => {
                        setGeneratorState({
                          place: 'Pantanal Wetland Habitat',
                          time: 'afternoon',
                          elements: ['jungle birds', 'frogs', 'insects', 'gentle water movement', 'distant jaguar calls'],
                          atmosphere: 'immersive',
                          isGenerating: false,
                          result: ''
                        });
                      }}
                      className="glass px-6 py-3 rounded-full text-xs font-bold text-[#d4fc79] border-[#d4fc79]/30 hover:bg-[#d4fc79]/10 transition-all"
                    >
                      Preset: Jaguar Territory
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="glass rounded-[32px] p-8 space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Location</label>
                        <input 
                          type="text" 
                          value={generatorState.place}
                          onChange={(e) => setGeneratorState(prev => ({ ...prev, place: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4fc79]/50"
                          placeholder="e.g. Amazon Rainforest"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Time of Day</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['morning', 'evening', 'night'].map(t => (
                            <button
                              key={t}
                              onClick={() => setGeneratorState(prev => ({ ...prev, time: t }))}
                              className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${generatorState.time === t ? 'bg-[#d4fc79] text-[#0a0c08]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Elements</label>
                        <div className="flex flex-wrap gap-2">
                          {['birds', 'water', 'wind', 'insects', 'rain', 'thunder'].map(e => (
                            <button
                              key={e}
                              onClick={() => {
                                const newElements = generatorState.elements.includes(e)
                                  ? generatorState.elements.filter(el => el !== e)
                                  : [...generatorState.elements, e];
                                setGeneratorState(prev => ({ ...prev, elements: newElements }));
                              }}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-bold capitalize transition-all ${generatorState.elements.includes(e) ? 'bg-[#d4fc79]/20 text-[#d4fc79] border border-[#d4fc79]/50' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'}`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Atmosphere</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['peaceful', 'wild', 'immersive'].map(a => (
                            <button
                              key={a}
                              onClick={() => setGeneratorState(prev => ({ ...prev, atmosphere: a }))}
                              className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${generatorState.atmosphere === a ? 'bg-[#d4fc79] text-[#0a0c08]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={handleGenerateSoundscape}
                        disabled={generatorState.isGenerating}
                        className="w-full py-4 bg-[#d4fc79] text-[#0a0c08] rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(212,252,121,0.3)] transition-all disabled:opacity-50"
                      >
                        {generatorState.isGenerating ? (
                          <Activity className="w-5 h-5 animate-spin" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                        {generatorState.isGenerating ? 'Generating...' : 'Generate Soundscape'}
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="glass rounded-[32px] p-12 min-h-[400px] flex flex-col relative overflow-hidden">
                      {generatorState.isGenerating ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
                          <div className="relative">
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-24 h-24 bg-[#d4fc79]/20 rounded-full blur-2xl"
                            />
                            <Activity className="w-12 h-12 text-[#d4fc79] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-display font-bold italic">Synthesizing Environment...</h3>
                            <p className="text-white/40 max-w-xs mx-auto">Gemini is crafting a high-fidelity auditory narrative of your chosen landscape.</p>
                          </div>
                        </div>
                      ) : generatorState.result ? (
                        <div className="space-y-8">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h3 className="text-3xl font-display font-bold italic">{generatorState.place}</h3>
                              <p className="text-[#d4fc79] text-[10px] uppercase tracking-widest font-bold">{generatorState.time} • {generatorState.atmosphere}</p>
                            </div>
                            <button 
                              onClick={() => handleNarrate(generatorState.result)}
                              className={`p-4 rounded-full transition-all ${isNarrating ? 'bg-[#d4fc79] text-[#0a0c08]' : 'bg-white/5 text-white/40 hover:text-white'}`}
                            >
                              {isNarrating ? <Pause className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                            </button>
                          </div>
                          <div className="prose prose-invert max-w-none">
                            <p className="text-xl text-white/80 leading-relaxed font-serif italic">
                              "{generatorState.result}"
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center text-white/20">
                          <Wind className="w-16 h-16" />
                          <div className="space-y-2">
                            <h3 className="text-2xl font-display font-bold italic">Ready to Create</h3>
                            <p className="max-w-xs mx-auto">Configure your environment on the left and click generate to begin the auditory journey.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          {activeTab === 'wildlife' && (
            <motion.div
              key="wildlife"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-2">
                  <h2 className="font-display text-5xl font-bold italic">Species Catalog</h2>
                  <p className="text-white/50 max-w-md">Detailed profiles of the species we monitor through sound.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                  <button 
                    onClick={() => isGalleryPlaying ? setIsGalleryPlaying(false) : playVoiceGallery(0)}
                    className={`flex-shrink-0 px-6 py-3 rounded-full border flex items-center gap-2 transition-all ${
                      isGalleryPlaying 
                        ? 'bg-[#d4fc79]/20 border-[#d4fc79] text-[#d4fc79]' 
                        : 'glass border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {isGalleryPlaying ? <Pause className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                    {isGalleryPlaying ? 'Stop Gallery' : 'Play Voice Gallery'}
                  </button>
                  <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {SPECIES.map((s, idx) => (
                      <button
                        key={s.id}
                        onClick={() => handleSpeciesSelect(s.id)}
                        className={`flex-shrink-0 px-6 py-3 rounded-full border transition-all relative ${
                          selectedSpecies === s.id 
                            ? 'bg-[#d4fc79] border-[#d4fc79] text-[#0a0c08]' 
                            : 'border-white/10 text-white/60 hover:border-white/30'
                        }`}
                      >
                        {currentGalleryIndex === idx && (
                          <motion.div 
                            layoutId="gallery-indicator"
                            className="absolute -top-1 -right-1 w-3 h-3 bg-[#d4fc79] rounded-full shadow-[0_0_10px_#d4fc79]"
                          />
                        )}
                        <span className="mr-2">{s.icon}</span>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 relative aspect-video rounded-[32px] overflow-hidden shadow-2xl">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={selectedSpecies || 'default'}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.6 }}
                      src={SPECIES.find(s => s.id === selectedSpecies)?.image || "https://images.unsplash.com/photo-1574068468668-a05a11f871da?auto=format&fit=crop&q=80&w=1000"}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-8 left-8">
                    <h3 className="text-4xl font-display font-bold mb-2">
                      {SPECIES.find(s => s.id === selectedSpecies)?.name || "Select a Species"}
                    </h3>
                    <div className="flex gap-4">
                      <span className="flex items-center gap-2 text-xs uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                        <Camera className="w-3 h-3" /> Photo Safari
                      </span>
                      <span className="flex items-center gap-2 text-xs uppercase tracking-widest bg-[#d4fc79]/20 text-[#d4fc79] px-3 py-1 rounded-full backdrop-blur-sm">
                        <Heart className="w-3 h-3" /> Endangered
                      </span>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-[32px] p-8 space-y-6 flex flex-col justify-center overflow-y-auto no-scrollbar">
                  {loading ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-8 bg-white/10 rounded w-3/4" />
                      <div className="h-24 bg-white/10 rounded" />
                      <div className="h-20 bg-white/10 rounded" />
                    </div>
                  ) : wildlifeData ? (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-[#d4fc79] font-bold mb-1">Scientific Name</p>
                          <p className="text-xl font-serif italic text-white/90">{wildlifeData.scientificName}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Taxonomy</p>
                          <p className="text-[10px] text-white/50">{wildlifeData.taxonomy.class} • {wildlifeData.taxonomy.order}</p>
                          <button 
                            onClick={() => handleNarrate(wildlifeData.description)}
                            className={`p-2 rounded-full glass border-white/10 hover:text-[#d4fc79] transition-colors ${isNarrating ? 'text-[#d4fc79]' : ''}`}
                          >
                            {isNarrating ? <Pause className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Diet</p>
                          <p className="text-xs text-white/80">{wildlifeData.diet}</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Trend</p>
                          <p className="text-xs text-white/80">{wildlifeData.populationTrend}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex justify-between items-center">
                          Vocalization Profile
                          <button 
                            onClick={() => handleNarrate(wildlifeData.vocalizationDescription, `The vocalization of the ${wildlifeData.name} is described as follows`)}
                            className={`flex items-center gap-1 text-[9px] text-[#d4fc79] hover:underline ${isNarrating ? 'opacity-50' : ''}`}
                          >
                            <Volume2 className="w-3 h-3" /> Hear Call Description
                          </button>
                        </p>
                        <p className="text-xs text-white/70 italic leading-relaxed">"{wildlifeData.vocalizationDescription}"</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Conservation Threats</p>
                        <div className="flex flex-wrap gap-2">
                          {wildlifeData.threats.map(threat => (
                            <span key={threat} className="text-[9px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase font-bold">
                              {threat}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-xs uppercase tracking-widest text-[#d4fc79] font-bold mb-2 flex items-center gap-2">
                          <Info className="w-3 h-3" /> Technical Note
                        </p>
                        <p className="text-xs text-white/80 leading-relaxed">{wildlifeData.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Habitat</p>
                          <p className="text-xs font-medium">{wildlifeData.habitat}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Status</p>
                          <p className="text-xs font-medium text-[#d4fc79]">{wildlifeData.conservationStatus}</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center space-y-4">
                      <Bird className="w-12 h-12 text-white/10 mx-auto" />
                      <p className="text-white/40 font-serif italic">Select a species to learn about their role in the ecosystem.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-40">
            <Volume2 className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-bold">Pantanal Soundscape &copy; 2026</span>
          </div>
          <div className="flex gap-8">
            {['Bioacoustics', 'Open Data', 'Research', 'Conservation'].map((link) => (
              <a key={link} href="#" className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30 hover:text-[#d4fc79] transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
