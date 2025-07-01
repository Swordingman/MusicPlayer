<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { usePlayerStore } from '@/stores/player';

onLaunch(() => {
  console.log("App Launch");
  const playerStore = usePlayerStore();
  playerStore.initializePlayer();
});

onShow(() => { console.log("App Show"); });
onHide(() => { console.log("App Hide"); });
</script>

<style lang="scss">
@import "@/static/iconfont.css";
@keyframes rotate {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>