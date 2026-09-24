// Sound Synthesizer Engine
      class WebAudioSoundSystem {
        constructor() {
          this.ctx = null;
          this.engineOsc = null;
          this.engineSubOsc = null;
          this.engineFilter = null;
          this.engineGain = null;

          this.squealNoise = null;
          this.squealFilter = null;
          this.squealGain = null;

          this.initialized = false;
          this.muted = false;
          this.isPlaying = false;
        }

        init() {
          try {
            const AudioContextClass =
              window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();

            // Engine main sound (aggressive sawtooth)
            this.engineOsc = this.ctx.createOscillator();
            this.engineOsc.type = "sawtooth";

            // Sub bass roar (triangle)
            this.engineSubOsc = this.ctx.createOscillator();
            this.engineSubOsc.type = "triangle";

            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = "lowpass";
            this.engineFilter.frequency.value = 160;

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.value = 0.0;

            this.engineOsc.connect(this.engineFilter);
            this.engineSubOsc.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            // Drift Tyre Squeal (modulated white noise with high resonance bandpass)
            const bufferSize = this.ctx.sampleRate * 2;
            const buffer = this.ctx.createBuffer(
              1,
              bufferSize,
              this.ctx.sampleRate,
            );
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
            }

            this.squealNoise = this.ctx.createBufferSource();
            this.squealNoise.buffer = buffer;
            this.squealNoise.loop = true;

            this.squealFilter = this.ctx.createBiquadFilter();
            this.squealFilter.type = "bandpass";
            this.squealFilter.frequency.value = 950;
            this.squealFilter.Q.value = 4.0;

            this.squealGain = this.ctx.createGain();
            this.squealGain.gain.value = 0.0;

            this.squealNoise.connect(this.squealFilter);
            this.squealFilter.connect(this.squealGain);
            this.squealGain.connect(this.ctx.destination);

            this.engineOsc.start(0);
            this.engineSubOsc.start(0);
            this.squealNoise.start(0);

            this.initialized = true;
          } catch (e) {
            console.error("Web Audio failed to initialize: ", e);
          }
        }

        resume() {
          if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume();
          }
        }

        startEngineSound() {
          if (!this.initialized) this.init();
          if (!this.initialized || !this.ctx) return;
          this.resume();
          if (this.muted) return;

          this.isPlaying = true;
          const t = this.ctx.currentTime;

          // Crank sound simulation
          this.engineGain.gain.setValueAtTime(0.0, t);
          this.engineGain.gain.linearRampToValueAtTime(0.12, t + 0.1);
          this.engineGain.gain.exponentialRampToValueAtTime(0.08, t + 0.4);

          this.engineOsc.frequency.setValueAtTime(30, t);
          this.engineOsc.frequency.exponentialRampToValueAtTime(95, t + 0.2);
          this.engineOsc.frequency.linearRampToValueAtTime(45, t + 0.5);

          this.engineSubOsc.frequency.setValueAtTime(15, t);
          this.engineSubOsc.frequency.exponentialRampToValueAtTime(47, t + 0.2);
          this.engineSubOsc.frequency.linearRampToValueAtTime(22, t + 0.5);
        }

        stopEngineSound() {
          if (!this.initialized || !this.ctx || !this.isPlaying) return;
          const t = this.ctx.currentTime;
          this.engineGain.gain.linearRampToValueAtTime(0.0, t + 0.25);
          this.isPlaying = false;
        }

        updateSound(rpm, isAccelerating, isDrifting, driveMode) {
          if (!this.initialized || !this.ctx || !this.isPlaying || this.muted)
            return;
          this.resume();

          const t = this.ctx.currentTime;

          // Map RPM (0 - 12000) to base synthesizer frequencies
          const baseFreq = 22 + (rpm / 12000) * 160;
          this.engineOsc.frequency.setTargetAtTime(baseFreq, t, 0.05);
          this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);

          // Change engine filter & tone based on Drive Mode
          let filterFreq = 140 + (rpm / 12000) * 800;
          let gainMultiplier = 0.06 + (rpm / 12000) * 0.06;

          if (driveMode === "SPORT") {
            filterFreq += 150;
            gainMultiplier *= 1.25;
          } else if (driveMode === "CORSA") {
            filterFreq += 350;
            gainMultiplier *= 1.55;
          }

          if (isAccelerating) {
            filterFreq += 250;
            gainMultiplier += 0.04;
          }

          this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);
          this.engineGain.gain.setTargetAtTime(gainMultiplier, t, 0.08);

          // Tyre drift squeal
          const squealVolume = isDrifting ? 0.07 : 0.0;
          this.squealGain.gain.setTargetAtTime(squealVolume, t, 0.05);
          if (isDrifting) {
            // Modulate squeal pitch slightly for slipping effect
            const mod = 900 + Math.sin(Date.now() * 0.05) * 80;
            this.squealFilter.frequency.setTargetAtTime(mod, t, 0.02);
          }
        }

        triggerShiftPop() {
          if (!this.initialized || !this.ctx || !this.isPlaying || this.muted)
            return;
          const t = this.ctx.currentTime;

          // Mimic a quick exhaust pop (unburnt fuel ignition)
          const pop = this.ctx.createOscillator();
          pop.type = "triangle";
          pop.frequency.setValueAtTime(60, t);
          pop.frequency.exponentialRampToValueAtTime(10, t + 0.12);

          const popGain = this.ctx.createGain();
          popGain.gain.setValueAtTime(0.15, t);
          popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

          pop.connect(popGain);
          popGain.connect(this.ctx.destination);
          pop.start(t);
          pop.stop(t + 0.15);
        }

        triggerCollisionSound() {
          if (!this.initialized || !this.ctx || !this.isPlaying || this.muted)
            return;
          const t = this.ctx.currentTime;

          // Low frequency impact thud
          const osc1 = this.ctx.createOscillator();
          osc1.type = "triangle";
          osc1.frequency.setValueAtTime(100, t);
          osc1.frequency.exponentialRampToValueAtTime(10, t + 0.3);

          // Metal scrape/crash noise using custom audio buffer
          const bufferSize = this.ctx.sampleRate * 0.3; // 0.3s duration
          const buffer = this.ctx.createBuffer(
            1,
            bufferSize,
            this.ctx.sampleRate,
          );
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;

          const noiseFilter = this.ctx.createBiquadFilter();
          noiseFilter.type = "bandpass";
          noiseFilter.frequency.setValueAtTime(350, t);
          noiseFilter.frequency.exponentialRampToValueAtTime(80, t + 0.3);

          const crashGain = this.ctx.createGain();
          crashGain.gain.setValueAtTime(0.25, t);
          crashGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

          osc1.connect(crashGain);
          noise.connect(noiseFilter);
          noiseFilter.connect(crashGain);
          crashGain.connect(this.ctx.destination);

          osc1.start(t);
          osc1.stop(t + 0.3);
          noise.start(t);
          noise.stop(t + 0.3);
        }

        muteSystem() {
          this.muted = true;
          if (this.initialized && this.engineGain) {
            this.engineGain.gain.value = 0;
            this.squealGain.gain.value = 0;
          }
        }

        unmuteSystem() {
          this.muted = false;
          if (
            this.initialized &&
            this.ctx &&
            this.isPlaying &&
            this.engineGain
          ) {
            this.engineGain.gain.value = 0.08;
          }
        }
      }

      const audio = new WebAudioSoundSystem();

      function startWithSound(enableSound) {
        const screen = document.getElementById("sound-onboarding");
        screen.style.opacity = "0";
        setTimeout(() => {
          screen.remove();
        }, 500);

        if (enableSound) {
          audio.init();
          audio.unmuteSystem();
          document.getElementById("btn-sound").classList.remove("active");
          document.getElementById("btn-sound").innerText = "MUTE";
        } else {
          audio.muteSystem();
          document.getElementById("btn-sound").classList.add("active");
          document.getElementById("btn-sound").innerText = "SOUND";
        }
      }

      function toggleSoundBtn() {
        const btn = document.getElementById("btn-sound");
        if (audio.muted) {
          audio.unmuteSystem();
          btn.classList.remove("active");
          btn.innerText = "MUTE";
        } else {
          audio.muteSystem();
          btn.classList.add("active");
          btn.innerText = "SOUND";
        }
      }