"""Wall-clock latency, sampled host RSS and native CUDA allocation peaks."""
import threading
import time


def measured(call,device,interval):
    import psutil
    import torch
    process = psutil.Process()
    baseline = process.memory_info().rss
    peak = [baseline]
    stop = threading.Event()
    def sample():
        while not stop.wait(interval):
            peak[0] = max(peak[0],process.memory_info().rss)
    thread = threading.Thread(target=sample,daemon=True)
    if device.startswith('cuda'):
        torch.cuda.synchronize()
        torch.cuda.reset_peak_memory_stats()
    thread.start()
    started = time.perf_counter()
    try:
        result = call()
        if device.startswith('cuda'):
            torch.cuda.synchronize()
        elapsed = time.perf_counter()-started
    finally:
        stop.set()
        thread.join()
    final = process.memory_info()
    peak[0] = max(peak[0],final.rss)
    metrics = {'wall_seconds':elapsed,'rss_baseline_bytes':baseline,'rss_sampled_peak_bytes':peak[0],
        'rss_sampled_delta_bytes':peak[0]-baseline,'rss_sample_interval_seconds':interval,
        'process_lifetime_peak_rss_bytes':getattr(final,'peak_wset',None),
        'cuda_peak_allocated_bytes':torch.cuda.max_memory_allocated() if device.startswith('cuda') else None,
        'cuda_peak_reserved_bytes':torch.cuda.max_memory_reserved() if device.startswith('cuda') else None}
    return result,metrics
