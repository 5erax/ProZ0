# Bàn giao mục 19–20 — Chỉ phát tiếng mưa Owner cung cấp

Issues #233–234. Baseline main 5fe5d521. Nhánh product/owner-backlog-rain-audio. Bảng 26 yêu cầu: [backlog](./phase2-owner-backlog-26.vi.md). Chỉ hai mục âm thanh được triển khai; 24 mục khác giữ OPEN.

## Hành vi

Trong Settings chọn Enable sound. Mưa mist-rain tại vị trí người chơi phát file lặp; clear/dry-wind dừng. Volume/mute áp dụng ngay; không restart khi vẫn cùng trạng thái mưa. Disconnect hoặc mất local actor dừng; destroy giải phóng media và listeners. Bật sound khi trời quang tải/prime file ở volume 0 rồi pause để mưa đến sau vẫn phát trong chính sách autoplay của browser. Không phát tiếng biome/nghiên cứu/inspect hay sound mới khác. Voice chat opt-in vẫn là giao tiếp.

## Nguồn file

Owner: mixkit-light-rain-loop-1253-_1_.ogg → assets/phase2/audio/owner-rain-loop.ogg. Copy nguyên byte, không transcode/remix. 568430 bytes. SHA256: 23075b2b3fbca8af77f5d1a0b5f2920cf2778b25eb8fa5cdbebe3c20c501781b. Vite build xuất owner-rain-loop-DQg8bmpI.ogg. File được cung cấp trực tiếp; không suy ra license từ tên file.

## Source và giao diện

- ColonyAudio.ts: một HTMLAudioElement loop, weather(ColonyWeather), destroy(); không còn region/cue API. Default mute/preload none. Play generation chống reject cũ làm tắt lần bật mới; lỗi hiện retry trong Settings.
- ColonyDepthOverlay.ts: solo truyền colonyWeatherAt(worldSeed, localPosition, authorityTick).weather; bỏ research/inspect playback.
- ColonyCoopRuntime.ts: cùng query theo scene/localPosition/tick; không READY hoặc mất actor chuyển clear.
- assets/phase2/audio: bỏ 5 WAV cũ, chỉ OGG approved; Phase1 archive giữ provenance và historical eventmap được đánh dấu superseded về runtime.
- Không đổi authority gameplay, protocol/save/content fingerprint hay schema. Không triển khai features deferred từ 26 issues.

## Kiểm chứng

Typecheck/lint PASS;149 unit PASS;181 integration PASS/3skip;13 determinism PASS;35 browser PASS, gồm4 test âm thanh mới. Browser kiểm tra default không tải, prime trong clear, actual OGG decode/play dưới gesture, rain→clear→rain, lặp qua cuối file, mute/volume, stale reject/retry/destroy. Mock lifecycle tests được tách khỏi actual media playback test; không giả rằng automated decode là Owner nghiệm thu nghe. Build Vercel PASS, output chỉ có một audioasset OGG, không WAV cũ.

E2E/CI/production evidence sẽ được ghi ở PR và comment giao việc sau khi hoàn tất. Gate frame 50 FPS/P95≤34ms giữ nguyên; #204 là vấn đề riêng, không tuyên bố audio sửa toàn bộ performance/co-op latency.

## Chính sách cho người nhận sau

Không tự bật lại archived cues hoặc tạo sound/synth/music khác. Chỉ add khi Owner yêu cầu thiết kế âm thanh. Nếu có approvedasset mới, thêm source/hash, weather/event contract và browser lifecycle/decode checks. Bảo đảm Vercel root và Pages/ProZ0 URL; không hardcode đường dẫn asset tuyệt đối.
