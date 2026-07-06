# KanbanTR Faz 0 — İlerleme Ledger'ı

Plan: `../../docs/superpowers/plans/2026-07-02-kanbantr-faz0.md`
Dal: `kanbantr-faz0` (fork: ugurreis/kan, upstream: kanbn/kan)

- Task 1: TAMAM (baseline doğrulandı: login 200, /api/health 200, dev Ready. postgres 5433'te docker, migrate uygulandı)
- Task 2: TAMAM (tr locale iskelet, commit 9074dde; extract 911 string)
- Task 3: TAMAM (commit 9074dde..9e8e6e1, inceleme temiz — Spec ✅, Important bulgular düzeltildi).
  911 string çevrildi; i18n.ts loadMessages'e tr dalı + eager katalog haritası (tr senkron, en+diğerleri lazy) + initializeI18n guard; lingui.tsx tarayıcı-dili tespitini kaldırıp Türkçe-öncelikli varsayılan yaptı; kök i18n:check regresyon guard'ı. Doğrulama: en-US tarayıcıda /login tam Türkçe, localStorage=en → İngilizce (lazy yol OK).
  Not (Task 5 için): upstream typecheck hataları var (NewCardForm.tsx dup props, board/index.tsx union type, partner/_utils) — benim dosyalarımda değil, prod build'i (next build) etkileyebilir; deploy öncesi çözülmeli.
- Task 4: TAMAM (commit 6426c2d..eb25950, inceleme + 2 fix turu).
  Kararlar (kullanıcı away, önerilen/güvenli seçildi): ad=KanbanTR (lib/brand.ts sabiti),
  aksan=indigo→emerald (butonlar monokrom kalır), destek linkleri kaldırıldı, landing/pricing ertelendi.
  Yapıldı: wordmark→KanbanTR (login/signup HER İKİ dal/404/SideNav/partner/public boards/onboarding),
  başlıklar "| {BRAND_TITLE_SUFFIX}" (placeholder), favicon.svg (emerald K)+manifest+_app metadata,
  UserMenu/FeedbackModal/ImportBoardsForm kan.bn destek/dok linkleri kaldırıldı, emerald aksan
  (Toggle/WorkspaceMenu/onay kutuları), .env(.example) WHITE_LABEL_HIDE_POWERED_BY=true, "Version"→"Sürüm".
  Doğrulama: /login+/signup tab+wordmark markalı+Türkçe (chrome-devtools); i18n:check PASS; typecheck temiz.
  KALAN MARKA İŞİ (bilinçli ertelendi — kullanıcı kararı/içerik gerekir):
   * terms/privacy/oss-friends sayfaları Kan.bn hukuk metni içeriyor → gerçek Nexovias hukuk metni gerekir (Faz 1).
   * cloud-only ölü slug prefix'leri (UpdateBoardSlugButton/Form, UpdateWorkspaceUrlForm) — NEXT_PUBLIC_KAN_ENV!=cloud olduğu için self-host'ta render OLMAZ; kozmetik kaynak sızıntısı.
   * public board "Powered by kan.bn" — HIDE_POWERED_BY env=true ile gizli (deploy'da env set edilmeli!).
- Task 5: bekliyor (Coolify demo — VPS/Coolify token kullanıcıdan gerekli; deploy'da
  NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY=true ZORUNLU set edilmeli).

- EK TUR (2026-07-03, kullanıcı isteği: "cloud-only neden ölü, terms/privacy doldur, landing markala, cilala, localde göster"):
  * brand.ts genişletildi: BRAND_COMPANY=Nexovias, BRAND_CONTACT_EMAIL=destek@nexovias.com (DOĞRULA!), BRAND_DOMAIN.
  * Cloud-only kan.bn/ prefix leak'leri BASE_URL'e sabitlendi: UpdateWorkspaceUrlForm, UpdateBoardSlugButton, UpdateBoardSlugForm.
  * terms + privacy sayfaları standart Türkçe içerikle yeniden yazıldı (Nexovias, Türkiye Cumhuriyeti hukuku, KVKK). Placeholder değil ama HUKUKÇU ONAYI gerekir.
  * Landing (home) rebrand + Türkçeleştirildi: Header wordmark+nav, Hero, Cta, Faqs (dürüst self-host içerik), Footer (docs/discord/status/roadmap/oss-friends kaldırıldı; AGPL kaynak+lisans linki kaldı), Features'tan "Entegrasyonlar (yakında)" ve roadmap linki kaldırıldı.
  * SAHTE SOSYAL KANIT KALDIRILDI: Logos.tsx + Testimonials.tsx silindi (Airbus/Lego/Deloitte + gerçek kişilere atfedilmiş yorumlar = yanıltıcı reklam riski). Cta'daki gerçek şirket slug'ları nötr Türkçe takım adlarıyla değiştirildi.
  * Pricing: /pricing ana sayfaya yönlendirildi (install-based'de self-servis bulut kademesi yanlış; gerçek paketleme Faz 1). Header/Footer'dan pricing linki kaldırıldı.
  * public board "Powered by kan.bn" → {BRAND_NAME} (HIDE_POWERED_BY ile zaten gizli).
  * HYDRATION BUG düzeltildi (upstream, marketing Layout): styled-jsx global'de resolvedTheme JS interpolasyonu → SSR/client hash uyumsuzluğu. Statik CSS + html.dark seçicisi yapıldı. Cta SVG gradient tema bağımlılığı kaldırıldı. Hero Image'e priority (LCP) eklendi. Sonuç: /, /terms konsolu 0 hata.
  * Doğrulama: chrome-devtools ile /, /terms Türkçe+markalı render, 0 konsol hatası. Kalan kan.bn = yalnız footer AGPL kaynak/lisans linkleri (kasıtlı).
  * AÇIK KALAN:
    - Hero görseli (hero-light/dark.png) hâlâ Kan.bn'in İNGİLİZCE roadmap ekran görüntüsü → çalışan Türkçe app'ten yeni screenshot çekilip değiştirilmeli.
    - Landing self-host'ta middleware ile GİZLİ (KAN_ENV!=cloud → /login redirect). Ürün kararı: demo/satışta landing gösterilsin mi? Gösterilecekse middleware koşulu değişmeli (ör. NEXT_PUBLIC_SHOW_LANDING flag).
    - destek@nexovias.com placeholder — gerçek adresle doğrula.
    - terms/privacy hukukçu onayı.
    - pricing view + PricingTiers/FeatureComparisonTable artık dead code (redirect nedeniyle) — Faz 1'de gerçek paketlemeyle ya doldur ya sil.

- EK TUR 2 (2026-07-03, kullanıcı kararları: hero'yu gerçek app'ten çek + landing self-host'ta gösterilsin):
  * LANDING GÖRÜNÜRLÜĞÜ: middleware.ts artık NEXT_PUBLIC_SHOW_LANDING=true iken self-host'ta da landing gösteriyor. .env + .env.example'a eklendi (localde =true).
  * HERO GÖRSELİ: gerçek Türkçe app'ten çekildi. demo@kanbantr.local kullanıcısı + "Nexovias" workspace + "Pazarlama Panosu" board (Temel Yol Haritası şablonu, 4 sütun, 9 Türkçe kart) oluşturuldu. hero-light.png + hero-dark.png (1520x640) public/'e kondu; orijinaller *.kanbn-orig.png olarak yedeklendi. home/index.tsx Image en/boy 1520x640'a güncellendi. [Doğrulandı: chrome-devtools landing'de yeni hero render]
  * APP İÇİ TÜRKÇE SIZINTILARI düzeltildi (upstream i18n anti-pattern: t`${cond ? "English" : ...}` İngilizce kelimeyi runtime değeri olarak enjekte ediyordu → çeviri çeviremiyordu). Koşullu tam Türkçe stringlere çevrildi:
    - boards/index.tsx (başlık+H1+kısayol açıklaması: Boards→Panolar), BoardsList.tsx (boş durum: Pano yok / Yeni bir pano oluşturarak başlayın / Yeni pano oluştur), NewBoardForm.tsx (Yeni pano / Pano oluştur), board/index.tsx (Pano bulunamadı), VisibilityButton.tsx (görünürlük mesajı), DeleteBoardConfirmation.tsx (silme onayı), MoveBoardForm.tsx + BoardDropdown.tsx (fallback değerler), AuthForm.tsx ("Şununla kayıt ol: e-posta" → "E-posta ile kayıt ol/devam et"; OAuth "{provider} ile devam et").
  * DİKKAT (kendi hatam, ders): dev sunucusu çalışırken `pnpm build` çalıştırmak apps/web/.next'i bozuyor (ENOENT _buildManifest → 500). İkisi aynı .next'i kullanıyor. Çözüm: build'i dev kapalıyken çalıştır ya da ayrı dizinde. .next temizlenip dev yeniden başlatıldı, /boards 200.
  * Doğrulama: build EXIT=0 (kod derleniyor); temiz dev'de /boards "Panolar" + Türkçe, / landing yeni hero + Türkçe, 0 konsol hatası. [Doğrulandı: pnpm build + chrome-devtools]

- EK TUR 3 (2026-07-03, kullanıcı isteği: "rakipleri araştır, 8-10 şablon ekle, kullanıcı hiçbir şeyle uğraşmasın, Trello-özel FAQ'ı 'diğer uygulamalardan taşıma' yap"):
  * GERÇEK DURUM (kod okundu): (a) Şablonlar zaten vardı (TemplateBoards.tsx, 8 adet) ama İNGİLİZCE kaynak string → kullanıcıya İngilizce sızıyordu. (b) board.create (engine) yalnız lists[]+labels[] alıyor, KART parametresi yok → örnek kartlı şablon engine değişikliği ister. (c) Import yalnız Trello+GitHub, ikisi de OAuth/API + sunucu env (TRELLO_APP_API_KEY) ister; "dışa aktarım dosyası yükle" diye bir şey YOK → eski FAQ zaten yanlıştı. [Doğrulandı: import.ts, integration.ts:14, NewBoardForm.tsx:99-108]
  * KARAR (kullanıcı away, güvenli/önerilen seçildi): örnek-kart seçeneği (engine'e dokunma kuralını gevşetir) ERTELENDİ; şablonlar frontend-only sütun+etiket olarak Türkçeleştirildi.
  * ŞABLONLAR: TemplateBoards.tsx getTemplates() 10 Türkçe şablonla yeniden yazıldı (rakip galerileri Trello/ClickUp/Asana/Todoist-TR + KOBİ ihtiyaçları): Basit Kanban, Yazılım Geliştirme, Ürün Yol Haritası, İçerik & Sosyal Medya Takvimi, Satış Pipeline (CRM), Pazarlama Kampanyası, Müşteri Destek, İşe Alım, Etkinlik Planlama, Haftalık Kişisel Plan. [Doğrulandı: chrome-devtools şablon seçicide 10'u da Türkçe render]
  * FAQ (Faqs.tsx): "Trello panolarımı taşıyabilir miyim?" KALDIRILDI. Yerine 2 soru: "Sıfırdan mı başlamam gerekiyor?" (10 hazır şablonu öne çıkarır → sıfır-friction) + "Panolarımı başka bir uygulamadan taşıyabilir miyim?" (dürüst: Trello+GitHub doğrudan/kurulum gerekir; Asana/Monday/Notion için şablon veya Trello üzerinden). [Doğrulandı: chrome-devtools /#faq]
  * APP İÇİ İngilizce sızıntı temizliği (cilala): NewBoardForm (Ad/Şablon kullan/Pano oluştur/validation/hata), BoardsList favori aria-label, BoardDropdown menü öğeleri+toast (Favorilere ekle/Panoyu arşivle/Panoyu sil vb.), ImportBoardsForm (Yeni içe aktarma/Kaynak seç/Bağlan/Tümünü seç/İçe aktarma tamamlandı/çoğul import butonları). [Doğrulandı: chrome-devtools /boards + import modal + yeni pano modal, hepsi Türkçe]
  * Doğrulama yöntemi: dev sunucusu (bt1cdlefx) canlı; tüm dosyalar hot-reload ile derlendi ve render oldu (build ÇALIŞTIRILMADI — .next bozulma dersine uyuldu). Import modalında "Bağlan" görünmesi Trello entegrasyonunun kurulu olmadığını doğruluyor → FAQ'daki "kurulumunuzda etkinleştirilmişse" dürüst.
  * AÇIK KALAN: örnek-kartlı şablon (engine kararı kullanıcıya soruldu, yanıt yok); ImportBoardsForm bazı ikincil string'ler (entegrasyon adımları) İngilizce kalmış olabilir — demo OAuth göstermiyor, düşük öncelik.

- EK TUR 4 (2026-07-03, kullanıcı isteği: "kart-seviyesi onay kutusu (yapıldı işaretle); admin+üyeler görsün" + "engine'e dokunma kuralını kaldır"):
  * KURAL KAYNAĞI netleştirildi: "engine'e dokunma" = Faz 0 spec/plan'da BENİM önerdiğim, kullanıcının onayladığı kısıt (design.md:43-46, faz0.md:15); amaç upstream (kanbn/kan) güncellemelerini temiz tutmak. Global kural değil. Kullanıcı bu özellik için kaldırdı → engine'e dokunuldu. SONUÇ: cards şeması/card router bundan sonra upstream merge'de elle çözüm gerektirebilir.
  * KARAR (AskUserQuestion): onay kutusu "bağımsız tik" — kart hangi sütunda olursa olsun işaretlenir, yerinde kalır (üstü çizili + soluk). Sütuna taşıma DEĞİL (iki 'done' kavramı karmaşası önlendi).
  * ENGINE değişiklikleri (dokunulan motor dosyaları):
    - packages/db/src/schema/cards.ts: cards tablosuna completed(boolean, default false, notNull) + completedAt(timestamp) + completedBy(uuid→user, set null) eklendi. boolean import edildi.
    - Migration: migrations/20260703131501_AddCardCompleted.sql (3× ADD COLUMN + FK; enum'a DOKUNULMADI → transaction-güvenli online DDL). `drizzle-kit migrate` ile local DB'ye uygulandı. [Doğrulandı: "migrations applied successfully"]
    - packages/db/src/repository/card.repo.ts: update() completed/completedAt/completedBy alır+set eder+döner; getWithListAndMembersByPublicId'e completed+completedAt kolonları eklendi.
    - packages/db/src/repository/board.repo.ts: byId + bySlug kart projeksiyonlarına completed:true (spread ...card ile UI'a akıyor).
    - packages/api/src/routers/card.ts: update input'a completed:z.boolean().optional(); işaretlenince completedAt=now/completedBy=userId, kaldırılınca null.
    - packages/api/src/schemas/card.ts: cardUpdateResponseSchema.completed(optional), cardDetailSchema.completed+completedAt.
    - packages/api/src/schemas/board.ts: boardDetailCardSchema + boardSlugCardSchema'ya completed:z.boolean() (zod .output() sıyırmasın diye ZORUNLU).
  * UI (frontend):
    - Card.tsx: completed + onToggleComplete prop; başlıktan önce yeşil tik (HiCheckCircle/HiOutlineCheckCircle), tıklayınca preventDefault+stopPropagation (Link'e gitmez), completed'da başlık line-through+soluk. Türkçe aria/title.
    - board/index.tsx: ayrı toggleCardCompletedMutation (optimistic: cache'te sadece completed flip'ler, drag/drop mutation'ına dokunmaz); Card'a completed=card.completed + onToggleComplete (yalnız canEditCard && !PLACEHOLDER → guest'te buton YOK, salt-okunur).
  * GÖRÜNÜRLÜK: completed state kartın verisi olduğu için board'u gören HERKESE (admin/member/guest) görünür; toggle yalnız düzenleme yetkisi olanlara. completedBy/completedAt DB'de saklanıyor ama henüz UI'da "kim/ne zaman" gösterilmiyor (ileride ActivityList/detay için hazır).
  * DOĞRULAMA (chrome-devtools, canlı DB round-trip): board.byId zod geçti (tüm kartlar render), NEX-3 tıklandı→"Tamamlanmadı olarak işaretle"ye döndü+gezinmedi, SAYFA YENİLENDİ→hâlâ tamamlanmış (DB'ye kalıcı yazıldı), screenshot: yeşil tik+üstü çizili. Sonra geri alındı (demo temiz). [Doğrulandı: chrome-devtools + drizzle-kit migrate]
  * TYPECHECK: @kan/db temiz; @kan/api hataları yalnız önceden var olan @kan/email JSX/tsconfig (notifications/auth) — benim dosyalarım değil; @kan/web 14 hata hepsi önceden kayıtlı upstream (NewCardForm dup props, board/index visibility union). Yeni hata YOK. [Doğrulandı: pnpm typecheck]
  * AÇIK KALAN: kart DETAY görünümünde "Tamamlandı" toggle'ı yok (sadece board kartında); "kim/ne zaman tamamladı" UI'da gösterilmiyor (veri hazır). İstenirse eklenir.

## EK TUR 5 — Kart DETAY "Tamamlandı" toggle + kim/ne zaman + date-fns tr fix (2026-07-03)
- İSTEK: kullanıcı "ekle" → önceki turda açık kalan iki madde (kart detay toggle + kim/ne zaman satırı) yapıldı.
- MOTOR/API (bilinçli, önceki override kapsamında):
  * card.repo.ts getWithListAndMembersByPublicId columns → completedBy: true eklendi.
  * schemas/card.ts cardDetailSchema → completedBy: z.string().nullable() eklendi (yoksa .output() strip ederdi).
- UI (apps/web/src/views/card/index.tsx):
  * Başlık ile açıklama arasına "Tamamlandı olarak işaretle"/"Tamamlandı" toggle butonu (yeşil pill); mevcut updateCard mutation kullanıldı (yeni mutation yok), onSettled→invalidateCard refetch.
  * canEdit değilse: tamamlanmışsa salt-okunur yeşil rozet, değilse hiçbir şey (guest/salt-okunur).
  * completedByName: workspaceMembers'tan user.id===card.completedBy eşleştirmesiyle çözülüyor (ekstra sorgu YOK); formatMemberDisplayName ile ad.
  * completedAt: date-fns format "d MMM yyyy" + dateLocale; "X tarafından D tarihinde tamamlandı" (dinamik değerler t`` içine — İngilizce literal değil, doğru kullanım).
  * isTemplate'te blok gizli.
- YAN DÜZELTME (önceden var olan bug): apps/web/src/hooks/useLocalisation.ts dateLocaleMap'te tr YOKtu → Türkçe locale'de TÜM tarihler enGB'ye düşüp İngilizce ay gösteriyordu (due-date'ler dahil). date-fns tr import + tr eşlemesi eklendi. Artık "3 Tem 2026" ve "yaklaşık 3 saat önce".
- DOĞRULAMA (chrome-devtools, canlı DB round-trip): /cards/f0x4mmmtrbvy açıldı → detayda toggle render, tıklandı → "Tamamlandı"+"Nexovias Demo tarafından 3 Jul→(fix sonrası) 3 Tem 2026 tarihinde tamamlandı"; SAYFA YENİLENDİ → hâlâ tamamlanmış (DB persist), ay Türkçe. Sonra geri alındı; psql: completed=f, completedBy/completedAt null (demo temiz). [Doğrulandı: chrome-devtools + psql]
- TYPECHECK: @kan/db temiz; @kan/api=5, @kan/web=14 — baseline ile birebir aynı, YENİ hata YOK (tr geçerli Locale anahtarı). [Doğrulandı: pnpm --filter typecheck]
- AÇIK KALAN: completedBy/completedAt ActivityList'e ayrı bir etkinlik satırı olarak yansımıyor (detayda gösteriliyor ama Etkinlik akışında değil). İstenirse eklenir. Deploy hâlâ duruyor.

## EK TUR 6 — Tamamlanma Etkinlik akışına yansıtma (2026-07-03)
- İSTEK: kullanıcı "ekle onuda" → önceki turda açık kalan "tamamlanma kart Etkinlik akışında görünmüyor" maddesi.
- ENUM RİSKİ ÇÖZÜLDÜ: card_activity_type Postgres enum'u. PG sürümü doğrulandı = 15.18 → ALTER TYPE ADD VALUE transaction içinde güvenli (aynı txn'de değer KULLANILMADIĞI sürece; migration yalnız ADD VALUE yapıyor). [Doğrulandı: SHOW server_version + pg_enum]
- MOTOR/API:
  * schema/cards.ts activityTypes'a "card.updated.completed" + "card.updated.uncompleted" eklendi (card.archived ÖNCESİ).
  * migrations/20260703140613_AddCardCompletedActivity.sql: 2× ALTER TYPE ADD VALUE ... BEFORE 'card.archived'. drizzle-kit generate ile üretildi (snapshot/journal senkron), drizzle-kit migrate ile uygulandı. pg_enum'da 4 complet% değer doğrulandı.
  * card.repo.ts getByPublicId columns'a completed: true (önceki durumu karşılaştırmak için).
  * routers/card.ts update handler: activities dizisine, input.completed !== undefined && existingCard.completed !== input.completed iken completed?completed:uncompleted push (yalnız DEĞİŞİMde yazar; bulkCreate zaten mevcut).
- UI (ActivityList.tsx): ACTIVITY_TYPE_MAP'e Türkçe kaynak "kartı tamamlandı olarak işaretledi" / "kartı tamamlanmadı olarak işaretledi" (katalog gerektirmez, Lingui source fallback — templates/FAQ kalıbı); ACTIVITY_ICON_MAP'e HiOutlineCheckCircle.
- DOĞRULAMA (chrome-devtools canlı): NEX-3 tamamla → Etkinlik akışında "Nexovias Demo kartı tamamlandı olarak işaretledi · bir dakikadan az önce"; geri al → "kartı tamamlanmadı olarak işaretledi" satırı da eklendi. Türkçe metin + Türkçe göreli zaman. Sonra 2 test etkinliği psql ile silindi + kart temiz (completed=f). [Doğrulandı: chrome-devtools + psql]
- TYPECHECK: @kan/db=0, @kan/api=5, @kan/web=14 — baseline birebir, YENİ hata YOK. [Doğrulandı: pnpm --filter typecheck]
- NOT: DEPLOY'da iki migration da uygulanmalı — 20260703131501_AddCardCompleted.sql VE 20260703140613_AddCardCompletedActivity.sql. Enum migration'ı transaction-safe (PG12+), ADD VALUE sırası card.archived öncesi.

## EK TUR 7 — Kartlı hazır şablonları /templates'e seed (2026-07-03)
- İSTEK: "hiç örnek şablon yok hala" → /templates sayfası boştu; kullanıcı AskUserQuestion'da "Kartlı hazır şablonlar (önerilen)"ı seçti.
- KÖK NEDEN: Gömülü getTemplates() (TemplateBoards.tsx) 10 şablonu YALNIZ yeni-pano akışında, kartsız gösteriyordu; /templates sayfası ise workspace "type=template" panolarını listeler → oraya düşmüyordu. createFromSnapshot kaynak panoyu KARTLARIYLA klonlar [board.repo.ts:882-898] → şablon-panosu kartlı olursa yeni pano da kartlı gelir.
- ÇÖZÜM:
  * scripts/seed-templates.mjs (yeni): pg ile doğrudan, 10 Türkçe şablonu type=template panosu olarak + örnek Türkçe kartlarla (toplam 47 kart) workspace'e ekler. Idempotent (aynı adlı silinmemiş şablon varsa atlar), transaction'lı, publicId/slug üretir, colours paletini kullanır. Args: <workspacePublicId> <createdByUserId>; verilmezse ilk workspace + admin üye. POSTGRES_URL env'den.
  * Local çalıştırıldı (Nexovias uvq7803i6q80 + demo user): 10 şablon eklendi, 0 atlandı.
  * TemplateBoards.tsx: gömülü getTemplates() statik listesi ve merge KALDIRILDI (artık templates = customTemplates); kullanılmayan `t` importu da silindi. Tek kaynak = workspace şablon-panoları; yeni-pano akışı da bunları customTemplates üzerinden gösterir (çift YOK).
- DOĞRULAMA (chrome-devtools): /templates → 10 şablon + "nene" listelendi; "Yazılım Geliştirme" açıldı → 6 liste, 6 kart doğru sütunlarda (Backlog'da 2), "Şablon" rozeti. Yeni-pano → "Şablon kullan" → 10 şablon TEK TEK (çift yok). createFromSnapshot kod okumasıyla kart-klonlama teyit edildi.
- TYPECHECK: @kan/web=14 (baseline birebir, yeni hata yok). DB/API bu turda değişmedi (seed standalone .mjs). [Doğrulandı: pnpm --filter @kan/web typecheck]
- DEPLOY NOTU: Her yeni single-tenant kurulumda şablonların gelmesi için scripts/seed-templates.mjs kurulum sonrası bir kez çalıştırılmalı (POSTGRES_URL + hedef workspace/admin ile). Migration'lar (20260703131501, 20260703140613) + bu seed = kurulum adımları.

## EK TUR 8 — Liste sayfasından şablon/pano silme (keşfedilebilirlik) (2026-07-03)
- İSTEK: "neneyi niye silemiyorum, kullanıcı istediği şablonu silebilmeli."
- BULGU: Silme ZATEN çalışıyordu (şablonu aç → menü → "Şablonu sil" → onay; nene bu yolla silindi). Sorun keşfedilebilirlik: /templates ve /boards LİSTE kartlarında yalnız favori butonu vardı, silme yoktu.
- ÇÖZÜM:
  * BoardsList.tsx: her karta HiOutlineTrash silme butonu (canDeleteBoard izniyle, hover'da görünür), onClick preventDefault/stopPropagation + openModal("DELETE_BOARD", board.publicId). aria-label şablon/pano'ya göre.
  * boards/index.tsx: DELETE_BOARD Modal render edildi → DeleteBoardConfirmation boardPublicId={entityId} isTemplate={!!isTemplate}.
  * DeleteBoardConfirmation.tsx: onSuccess'e void utils.board.all.invalidate() eklendi → liste anında yerinde güncellenir (aynı rotada kalınca refetch olması için).
- DOĞRULAMA (chrome-devtools): /templates'te 10 kartta "Şablonu sil" göründü; "Etkinlik Planlama" silindi → modal onayı → kart YERİNDE kayboldu (gezinme yok), diğer 9 kaldı. Sonra seed tekrar → idempotent (9 atlandı, 1 geri eklendi). [Doğrulandı: chrome-devtools + seed çıktısı]
- TYPECHECK: @kan/web=14 baseline, yeni hata yok. [Doğrulandı: pnpm --filter @kan/web typecheck]

## EK TUR 9 — Nexovias renk uyumu + fonksiyon denetimi (2026-07-03)
- İSTEK: "bütün butonlar/fonksiyonlar hazır mı denetle; renkleri DOA/nexovias-web sitesiyle ilişkilendir."
- NEXOVIAS PALETİ [Doğrulandı: DOA/nexovias-web/deploy/css/site.css:6-13]: zemin #060d0b/#040908, ana vurgu neon camgöbeği #00ffcc + #00e0b3, ikincil mavi #3a7bff/mor #7b5cff, metin #e6f1ec.
- MEVCUT DURUM [Doğrulandı: tooling/tailwind/web.ts:60-85 + Button.tsx:46]: KanbanTR tamamen gri tonlamalı; accent yok; birincil buton bg-light-1000 (siyah)/dark-1000 (beyaz).
- KARAR: Kullanıcı AskUserQuestion'a yanıt vermedi (klavyede değil) → danışman modu "en iyi kararla ilerle": ÖNERİLEN A (uyumlu). Neon #00ffcc'yi birincil yapmak WCAG kontrastından kalır + açık B2B UI'da uygunsuz; bunun yerine aynı aileden okunur teal.
- YAPILAN:
  * tooling/tailwind/web.ts: brand-400..800 (teal ailesi, brand-600=#0d9488 = mevcut label Teal), nexo-cyan #00ffcc, nexo-cyan-dim tokenları eklendi.
  * Button.tsx primary: bg-brand-700 text-white hover:bg-brand-800 + focus-visible:ring-nexo-cyan; dark:bg-brand-500 dark:text-dark-50 dark:hover:bg-brand-400. Kontrast doğrulandı: teal-700/beyaz=5.48:1, teal-500/koyu=7.3:1 (ikisi de WCAG-AA).
  * DOĞRULAMA (chrome-devtools screenshot): /boards "Yeni" butonu artık teal, okunur.
- FONKSİYON DENETİMİ (chrome-devtools sweep): Panolar, Pano görünümü, Kart detay, Şablonlar, Üyeler ("Davet Et"), Ayarlar (6 sekme: Hesap/Çalışma alanı/İzinler/API/Webhook/Entegrasyonlar; Dosya Seç, Hesabı sil, Şifre Değiştir, dil/font seçiciler) — hepsi yükleniyor, Türkçe, butonlar yerinde, ölü buton görülmedi. Bu oturumun özellikleri (tamamlandı tik/detay/etkinlik, şablonlar, silme) ayrıca doğrulanmıştı.
- TYPECHECK: @kan/web=14 baseline, yeni hata yok. [Doğrulandı: pnpm --filter @kan/web typecheck]
- KAPSAM NOTU: Renk uyumu "faz 1" = en görünür öğe (birincil butonlar) + odak halkaları. Bağlantılar, aktif nav, diğer accent'ler hâlâ gri; istenirse derinleştirilir. Fable subagent'ı GEREKMEDİ (değişiklik küçük/kontrollü, inline yapıldı).

## EK TUR 10 — Ürün adı KanbanTR → Nexora (2026-07-03)
- İSTEK: "projenin adını değiştir Nexora yap." (Ürün markası; vendor/workspace "Nexovias" AYRI, dokunulmadı.)
- DEĞİŞİKLİK (3 yer — marka merkezî brand.ts'te olduğu için tek noktadan besleniyor):
  * apps/web/src/lib/brand.ts: BRAND_NAME "KanbanTR"→"Nexora" (wordmark, sayfa başlıkları, hukuk, footer buradan). BRAND_TITLE_SUFFIX = BRAND_NAME.
  * apps/web/public/manifest.json: name + short_name → "Nexora".
  * scripts/seed-templates.mjs: yorum başlığı.
  * DOĞRULANDI: landing'deki tüm marka refs (home/index.tsx:19, Faqs/Footer/Header) BRAND_NAME kullanıyor; sabit-kodlu "KanbanTR" YOK. tr katalogda 0.
- DOĞRULAMA (chrome-devtools): header logosu artık "Nexora"; curl /login SSR "Nexora".
- BİLİNEN DEV ARTEFAKTI: rename sonrası kimlikli sayfalarda "Text content does not match server-rendered HTML" hydration overlay'i çıktı. Kök neden [Doğrulandı: curl /]: dev sunucusu bazı route'ların (/, dashboard) SSR modülünü stale cache'ten servis ediyor (KanbanTR), client bundle Nexora → uyumsuzluk. Kaynak DOĞRU; PRODUCTION BUILD'de her route tek seferde Nexora derlenir, uyumsuzluk OLMAZ. Çözüm: dev sunucu RESTART (browser reload/dosya-touch yetmedi). KOD DEĞİŞİKLİĞİ GEREKMEZ.
- TYPECHECK: değişiklikler string/JSON, tip etkisi yok.

## EK TUR 11 — Görsel cila: tek-kişi-tek-renk avatar + aciliyet rozetleri + zengin pano kartları (2026-07-06)
- BAĞLAM: Bu tur önceki oturumdan COMMIT'SİZ WIP olarak devralındı (11 dosya). "devam" ile tamamlandı ve canlı doğrulandı.
- GERÇEK BASELINE DÜZELTMESİ: progress.md eski turlarda "@kan/web=14 baseline" diyordu; git stash + typecheck ile ölçülen GERÇEK baseline = 13. [Doğrulandı: git stash -u + pnpm typecheck karşılaştırması]. WIP, MemberSelector'a zorunlu `email` ekleyip CardContextMembersModal'ı beslemediği için 14'e çıkarmıştı (1 regresyon).
- YAPILAN DÜZELTMELER (bu oturum):
  * utils/avatarColor.ts (WIP'ten): tek kaynak `getAvatarColor(seed=email)` — aynı kişi TÜM sitede aynı renk (8 renkli palet). analytics + BoardPreview + NewBoardForm + Avatar.tsx dağınık `AVATARS/hashIndex` kopyaları buna bağlandı.
  * REGRESYON KAPATILDI: CardContextMembersModal.tsx formattedMembers'a `email` alanı eklendi (card/index.tsx zaten besliyordu; ikinci çağıran atlanmıştı) → typecheck 14→13 baseline'a döndü. [Doğrulandı: pnpm --filter @kan/web typecheck]
  * DRY: `dueTone` 3 dosyaya (Card.tsx, DueDateSelector.tsx, BoardPreview.tsx) kopyalanmıştı → tek `utils/dueTone.ts`'e alındı (geçmiş=kırmızı, ≤3g=amber, ileri=emerald). Card.tsx'te fonksiyon import bloğunun ortasına düşmüştü, o da giderildi.
  * i18n DÜZELTMESİ: DueDateSelector tarih rozeti `format(...)`'i locale'siz çağırıp en-US'a düşüyordu ("10 Jul 2026"). useLocalisation dateLocale eklendi → "10 Tem 2026" (EK TUR 5 Türkçe-tarih hattıyla tutarlı). [Doğrulandı: chrome-devtools reload]
- CANLI DOĞRULAMA (chrome-devtools, localhost:3001, demo DB):
  * /templates + /boards: zengin BoardsList kartları — etiket renk çubukları, liste kolonları önizleme ("+N" taşma), gradient ikon, uzatılmış kart. Gerçek şablon/pano verisinden.
  * Pano (Mobil Uygulama): Card.tsx aciliyet rozetleri — NEX-14 "9 Tem" amber (≤3g), diğerleri emerald pill + saat ikonu. Avatar renkleri kişi-başı tutarlı (AK kırmızı, ED teal).
  * Kart detayı (NEX-11): MemberSelector "+ Ekle" üye atanmışken de görünür; Üyeler avatarı renkli; Son tarih rozeti Türkçe.
  * Konsol: yalnız önceden var olan dev uyarıları (Tooltip unmount, Tiptap SSR) — değişen bileşenlerden hata YOK.
  * analytics: rol-korumalı (demo admin değil, Ayarlar'a yönlendi); getAvatarColor aynı util, 4 yüzeyde teyitli.
- TYPECHECK: @kan/web=13 (gerçek baseline, YENİ hata yok). [Doğrulandı: pnpm --filter @kan/web typecheck]
- DURUM: Kod hazır + doğrulandı. COMMIT KULLANICI ONAYI BEKLİYOR (henüz commit'lenmedi). Deploy hâlâ duruyor (token yok).
